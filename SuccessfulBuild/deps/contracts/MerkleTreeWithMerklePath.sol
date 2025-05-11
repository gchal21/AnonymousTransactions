// SPDX-License-Identifier: GPL-3.0-only

pragma solidity ^0.7.3;

interface Hasher {
    function poseidon(bytes32[2] calldata leftRight)
    external
    pure
    returns (bytes32);
}

contract MerkleTreeWithHistory {
    uint256 public constant FIELD_SIZE =
    21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 public constant ZERO_VALUE =
    21663839004416932945382355908790599225266501822907911457504978515578255421292; // = keccak256("tornado") % FIELD_SIZE

    Hasher public hasher;

    uint32 public immutable levels;

    // the following variables are made public for easier testing and debugging and
    // are not supposed to be accessed in regular code
    bytes32[] public filledSubtrees;
    bytes32[] public currentProofPath;
    bytes32[] public zeros;
    uint32 public currentRootIndex = 0;
    uint32 public nextIndex = 0;
    uint32 public constant ROOT_HISTORY_SIZE = 100;
    bytes32[ROOT_HISTORY_SIZE] public roots;
    bytes32[] public leaves; // Add this line

    constructor(uint32 _treeLevels, address _hasher) {
        require(_treeLevels > 0, "_treeLevels should be greater than zero");
        require(_treeLevels < 32, "_treeLevels should be less than 32");

        hasher = Hasher(_hasher);
        levels = _treeLevels;

        bytes32 currentZero = bytes32(ZERO_VALUE);
        zeros.push(currentZero);
        filledSubtrees.push(currentZero);

        for (uint32 i = 1; i < _treeLevels; i++) {
            currentZero = hashLeftRight(currentZero, currentZero);
            zeros.push(currentZero);
            filledSubtrees.push(currentZero);
            currentProofPath.push(currentZero);
        }

        roots[0] = hashLeftRight(currentZero, currentZero);
    }

    /**
    @dev Hash 2 tree leaves, returns MiMC(_left, _right)
  */
    function hashLeftRight(bytes32 _left, bytes32 _right)
    public
    view
    returns (bytes32)
    {
        require(
            uint256(_left) < FIELD_SIZE,
            "_left should be inside the field"
        );
        require(
            uint256(_right) < FIELD_SIZE,
            "_right should be inside the field"
        );
        bytes32[2] memory leftright = [_left, _right];
        return hasher.poseidon(leftright);
    }

    function _insert(bytes32 _leaf) internal returns (uint32 index) {
        uint32 currentIndex = nextIndex;
        require(
            currentIndex != uint32(2)**levels,
            "Merkle tree is full. No more leafs can be added"
        );
        nextIndex += 1;
        leaves.push(_leaf); // Store the leaf in the leaves array
        bytes32 currentLevelHash = _leaf;
        bytes32 left;
        bytes32 right;

        for (uint32 i = 0; i < levels; i++) {
            if (currentIndex % 2 == 0) {
                left = currentLevelHash;
                right = zeros[i];

                filledSubtrees[i] = currentLevelHash;
                currentProofPath[i] = right;
            } else {
                left = filledSubtrees[i];
                right = currentLevelHash;
            }

            currentLevelHash = hashLeftRight(left, right);


            currentIndex /= 2;
        }

        currentRootIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        roots[currentRootIndex] = currentLevelHash;
        return nextIndex - 1;
    }

    function _getPath() external view returns (bytes32[] memory) {
        return currentProofPath;
    }
    /**
    @dev Whether the root is present in the root history
  */
    function isKnownRoot(bytes32 _root) public view returns (bool) {
        if (_root == 0) return false;

        uint32 i = currentRootIndex;
        do {
            if (_root == roots[i]) return true;
            if (i == 0) i = ROOT_HISTORY_SIZE;
            i--;
        } while (i != currentRootIndex);
        return false;
    }

    /**
    @dev Returns the last root
  */
    function getLastRoot() public view returns (bytes32) {
        return roots[currentRootIndex];
    }


    function getNodeAt(uint level, uint index) public view returns (bytes32) {
        require(level <= levels, "Level out of bounds");
        require(index < (1 << level), "Index out of bounds");

        // Start from level 0 (leaves)
        bytes32[] memory currentLevel = new bytes32[](1 << levels);

        // Fill in the leaves and pad with zeros
        for (uint i = 0; i < (1 << levels); i++) {
            if (i < leaves.length) {
                currentLevel[i] = leaves[i];
            } else {
                currentLevel[i] = zeros[0];
            }
        }

        // Traverse up the tree until we reach the desired level
        for (uint l = 0; l < level; l++) {
            bytes32[] memory nextLevel = new bytes32[](currentLevel.length / 2);
            for (uint i = 0; i < currentLevel.length; i += 2) {
                nextLevel[i / 2] = hashLeftRight(currentLevel[i], currentLevel[i + 1]);
            }
            currentLevel = nextLevel;
        }

        return currentLevel[index];
    }

}