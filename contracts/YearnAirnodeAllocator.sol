//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {AllocationLogger} from "./AllocationLogger.sol";
import {IVault} from "./interfaces/IVault.sol";
import {IDebtAllocator} from "./interfaces/IDebtAllocator.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RrpRequesterV0} from "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";
import {SturdySubnetEncoder} from "./SturdySubnetEncoder.sol";

contract YearnAirnodeAllocator is RrpRequesterV0, Ownable {
    using SturdySubnetEncoder for bytes;

    address public airnodeAddress;
    address public sponsorWalletAddress;
    mapping(bytes32 => bool) public incomingFulfillments;
    bytes public currentResponseData;

    constructor(
        address _airnodeRrp,
        address _airnodeAddress,
        address _sponsorWalletAddress
    ) RrpRequesterV0(_airnodeRrp) {
        airnodeAddress = _airnodeAddress;
        sponsorWalletAddress = _sponsorWalletAddress;
    }

    // To receive funds from the sponsor wallet and send them to the owner.
    receive() external payable {
        payable(owner()).transfer(address(this).balance);
    }

    function setSponsorWalletAddress(address sponsorWallet) public onlyOwner {
        sponsorWalletAddress = sponsorWallet;
    }

    function _callTheAirnode(
        address airnode,
        bytes32 endpointId,
        address sponsor,
        address sponsorWallet,
        bytes memory parameters // Inbound API parameters which may already be ABI encoded`
    ) internal {
        /// Make the Airnode request
        bytes32 airnodeRequestId = airnodeRrp.makeFullRequest(
            airnode, // airnode
            endpointId, // endpointId
            sponsor, // sponsor's address
            sponsorWallet, // sponsorWallet
            address(this), // fulfillAddress
            this.fulfillAllocationRequest.selector, // fulfillFunctionId
            parameters // API parameters
        );
        incomingFulfillments[airnodeRequestId] = true;
    }

    function requestAllocation(
        uint256 totalAssets,
        address userAddress,
        SturdySubnetEncoder.Pool[] memory pools
    ) public {
        bytes memory parameters = abi.encode(
            bytes32("1B"),
            bytes32("encoded_data"),
            SturdySubnetEncoder.encodeAssetsPoolsData(
                totalAssets,
                userAddress,
                pools
            )
        );
        _callTheAirnode(
            address(airnodeAddress),
            0xb3134e38da62db0e5b377c1f6c181bb3631a3a9bb6559f78da800bb46892fbb4, // endpointId for /allocate endpoint on sturdy subnet validator API
            address(this),
            sponsorWalletAddress,
            parameters
        );
    }

    /// The AirnodeRrpV0.sol protocol contract will callback here.
    function fulfillAllocationRequest(
        bytes32 airnodeRequestId,
        bytes calldata data
    ) external onlyAirnodeRrp {
        currentResponseData = abi.decode(data, (bytes));
        incomingFulfillments[airnodeRequestId] = false;
    }

    function applyAllocations(address debtAllocatorAddress) public {
        SturdySubnetEncoder.DecodedResponseData
            memory decodedResponse = SturdySubnetEncoder.decodeResponse(
                currentResponseData
            );

        IDebtAllocator debtAllocator = IDebtAllocator(debtAllocatorAddress);
        // here we assume that the allocations and strategies are in the same corresponding order
        IVault vault = IVault(debtAllocator.vault());
        address[] memory strategies = vault.get_default_queue();

        if (!(strategies.length == decodedResponse.allocations.length)) {
            revert AllocationLogger.MismatchedArrays();
        }

        // update debt of vaults
        for (uint256 i = 0; i < strategies.length; i++) {
            debtAllocator.update_debt(
                strategies[i],
                decodedResponse.allocations[i]
            );
        }

        // Emit the event
        // AllocationLogger.logAllocation(allocationUid, minerUid, userAddress, strategies, allocationAmounts);
        emit AllocationLogger.AllocationEvent(
            decodedResponse.requestUUID,
            decodedResponse.minerUID,
            address(vault),
            decodedResponse.addresses,
            decodedResponse.allocations
        );
    }

    function withdraw(
        address airnode,
        address sponsorWallet
    ) external onlyOwner {
        airnodeRrp.requestWithdrawal(airnode, sponsorWallet);
    }
}
