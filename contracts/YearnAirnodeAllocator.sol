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

    struct Pool {
        uint8 poolType;
        bytes32 poolId;
        address contractAddress;
    }

    struct Allocation {
        uint8 apy;
        bytes32 poolId;
        address contractAddress;
    }

    address sponsorWalletAddress;
    mapping(bytes32 => bool) incomingFulfillments;

    constructor(
        address _airnodeRrp,
        address _sponsorWalletAddress
    ) RrpRequesterV0(_airnodeRrp) {
        sponsorWalletAddress = _sponsorWalletAddress;
    }

    function setSponsorWalletAddress(address sponsorWallet) public onlyOwner {
        sponsorWalletAddress = sponsorWallet;
    }

    function _callTheAirnode(
        address airnode,
        bytes32 endpointId,
        address sponsor,
        address sponsorWallet,
        bytes memory parameters // Inbound API parameters which may already be ABI encoded
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
            address(airnodeRrp),
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
    ) external onlyAirnodeRrp {}

    function applyAllocation(
        bytes32 allocationUid,
        uint256 minerUid,
        address debtAllocatorAddress,
        address[] memory underlyingPools,
        uint256[] memory allocationAmounts
    ) public {
        IDebtAllocator debtAllocator = IDebtAllocator(debtAllocatorAddress);
        IVault vault = IVault(debtAllocator.vault());
        address[] memory strategies = vault.get_default_queue();

        if (!(strategies.length == allocationAmounts.length)) {
            revert AllocationLogger.MismatchedArrays();
        }

        // update debt of vaults
        for (uint256 i = 0; i < strategies.length; i++) {
            debtAllocator.update_debt(strategies[i], allocationAmounts[i]);
        }

        // Emit the event
        // AllocationLogger.logAllocation(allocationUid, minerUid, userAddress, strategies, allocationAmounts);
        emit AllocationLogger.AllocationEvent(
            allocationUid,
            minerUid,
            address(vault),
            underlyingPools,
            allocationAmounts
        );
    }
}
