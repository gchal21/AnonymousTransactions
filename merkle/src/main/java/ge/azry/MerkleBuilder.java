package ge.azry;

import java.util.ArrayList;
import java.util.List;

public class MerkleBuilder {
  private final HashProvider hashProvider;
  private final int levels;

  public MerkleBuilder(HashProvider hashProvider, int levels) {
    this.hashProvider = hashProvider;
    this.levels = levels;
  }


  public List<MerklePathNode> buildMerklePath(byte[] leafHash, List<byte[]> filledSubtrees, List<byte[]> zeros, long currentIndex) {
    List<MerklePathNode> path = new ArrayList<>();
    byte[] left;
    byte[] right;
    byte[] currentLevelHash = leafHash;

    for (int i = 0; i < levels; i++) {
      if (currentIndex % 2 == 0) {
        left = currentLevelHash;
        right = zeros.get(i);
        path.add(new MerklePathNode(0, right));
      } else {
        left = filledSubtrees.get(i);
        right = currentLevelHash;
        path.add(new MerklePathNode(1, left));
      }

      currentLevelHash = hashProvider.hashLeftRight(left, right);

      currentIndex /= 2;
    }

    return path;
  }

}
