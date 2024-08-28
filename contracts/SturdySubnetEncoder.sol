// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library SturdySubnetEncoder {
    struct Pool {
        uint8 poolType;
        address contractAddress;
    }

    struct DecodedResponseData {
        bytes32 requestUUID;
        uint256 minerUID;
        address[] addresses;
        uint256[] allocations;
    }

    function decodeResponse(bytes memory encodedData) internal pure returns (DecodedResponseData memory) {
        DecodedResponseData memory decodedData;

        (
            decodedData.requestUUID,
            decodedData.minerUID,
            decodedData.addresses,
            decodedData.allocations
        ) = abi.decode(encodedData, (bytes32, uint256, address[], uint256[]));

        return decodedData;
    }

    // Encodes the totalAssets, userAddress, and pools array into a bytes array
    function encodeAssetsPoolsData(
        uint256 totalAssets,
        address userAddress,
        Pool[] memory pools
    ) internal pure returns (bytes memory) {
        // Create a bytes array with initial size to fit all data
        bytes memory data = abi.encode(totalAssets, userAddress, pools);
        return data;
    }

    // Decodes the bytes array back into totalAssets, userAddress, and pools array
    function decodeAssetsPoolsData(
        bytes memory encodedData
    ) internal pure returns (uint256, address, Pool[] memory) {
        (uint256 totalAssets, address userAddress, Pool[] memory pools) = abi
            .decode(encodedData, (uint256, address, Pool[]));
        return (totalAssets, userAddress, pools);
    }
}
