package ge.azry;

public class MerklePathNode {
  int pathIndex;
  byte[] hash;

  public MerklePathNode(int pathIndex, byte[] hash) {
    this.pathIndex = pathIndex;
    this.hash = hash;
  }

  public int getPathIndex() {
    return pathIndex;
  }

  public byte[] getHash() {
    return hash;
  }
}
