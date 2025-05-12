package ge.azry;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

public class Main {






  public static void main(String[] args) {

//     Example usage of the MerkleBuilder
    HashProvider hashProvider = new HashProvider() {
      @Override
      public byte[] hashLeftRight(byte[] left, byte[] right) {
        try {
          // Convert inputs to hex BigIntegers
          String a = new java.math.BigInteger(1, left).toString();
          String b = new java.math.BigInteger(1, right).toString();

          // Call Node.js script
          ProcessBuilder builder = new ProcessBuilder("node", "poseidon.js", a, b);
          builder.redirectErrorStream(true);
          Process process = builder.start();

          BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
          String line;
          String output = null;
          while ((line = reader.readLine()) != null) {
            if (line.startsWith("0x")) {
              output = line;
              break;
            }
          }

          int exitCode = process.waitFor();
          if (exitCode != 0 || output == null) {
            throw new RuntimeException("Poseidon hashing failed");
          }

          return hexStringToByteArray(output.substring(2));
        } catch (Exception e) {
          throw new RuntimeException("Error calling Poseidon hash", e);
        }
      }

      private byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
          data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                               + Character.digit(s.charAt(i+1), 16));
        }
        return data;
      }
    };
    int levels = 20; // Example number of levels
    MerkleBuilder merkleBuilder = new MerkleBuilder(hashProvider, levels);

    List<byte[]> filledSubtrees = new ArrayList<>();
    String hexString = "0x2fe54c60d3acabf3343a35b6eba15db4821b340f76e741e2249685ed4899af6c,0x13e37f2d6cb86c78ccc1788607c2b199788c6bb0a615a21f2e7a8e88384222f8,0x217126fa352c326896e8c2803eec8fd63ad50cf65edfef27a41a9e32dc622765,0x0e28a61a9b3e91007d5a9e3ada18e1b24d6d230c618388ee5df34cacd7397eee,0x27953447a6979839536badc5425ed15fadb0e292e9bc36f92f0aa5cfa5013587,0x194191edbfb91d10f6a7afd315f33095410c7801c47175c2df6dc2cce0e3affc,0x1733dece17d71190516dbaf1927936fa643dc7079fc0cc731de9d6845a47741f,0x267855a7dc75db39d81d17f95d0a7aa572bf5ae19f4db0e84221d2b2ef999219,0x1184e11836b4c36ad8238a340ecc0985eeba665327e33e9b0e3641027c27620d,0x0702ab83a135d7f55350ab1bfaa90babd8fc1d2b3e6a7215381a7b2213d6c5ce,0x2eecc0de814cfd8c57ce882babb2e30d1da56621aef7a47f3291cffeaec26ad7,0x280bc02145c155d5833585b6c7b08501055157dd30ce005319621dc462d33b47,0x045132221d1fa0a7f4aed8acd2cbec1e2189b7732ccb2ec272b9c60f0d5afc5b,0x27f427ccbf58a44b1270abbe4eda6ba53bd6ac4d88cf1e00a13c4371ce71d366,0x1617eaae5064f26e8f8a6493ae92bfded7fde71b65df1ca6d5dcec0df70b2cef,0x20c6b400d0ea1b15435703c31c31ee63ad7ba5c8da66cec2796feacea575abca,0x09589ddb438723f53a8e57bdada7c5f8ed67e8fece3889a73618732965645eec,0x0064b6a738a5ff537db7b220f3394f0ecbd35bfd355c5425dc1166bf3236079b,0x095de56281b1d5055e897c3574ff790d5ee81dbc5df784ad2d67795e557c9e9f,0x11cf2e2887aa21963a6ec14289183efe4d4c60f14ecd3d6fe0beebdf855a9b63";

    for (String hex : hexString.split(",")) {
      String cleanHex = hex.startsWith("0x") ? hex.substring(2) : hex;
      byte[] bytes = hexStringToByteArray(cleanHex);
      filledSubtrees.add(bytes);
    }

    // Create a list of zeros for the Merkle path




    List<byte[]> zeros = new ArrayList<>();

    String hexZeros = "0x2fe54c60d3acabf3343a35b6eba15db4821b340f76e741e2249685ed4899af6c,0x13e37f2d6cb86c78ccc1788607c2b199788c6bb0a615a21f2e7a8e88384222f8,0x217126fa352c326896e8c2803eec8fd63ad50cf65edfef27a41a9e32dc622765,0x0e28a61a9b3e91007d5a9e3ada18e1b24d6d230c618388ee5df34cacd7397eee,0x27953447a6979839536badc5425ed15fadb0e292e9bc36f92f0aa5cfa5013587,0x194191edbfb91d10f6a7afd315f33095410c7801c47175c2df6dc2cce0e3affc,0x1733dece17d71190516dbaf1927936fa643dc7079fc0cc731de9d6845a47741f,0x267855a7dc75db39d81d17f95d0a7aa572bf5ae19f4db0e84221d2b2ef999219,0x1184e11836b4c36ad8238a340ecc0985eeba665327e33e9b0e3641027c27620d,0x0702ab83a135d7f55350ab1bfaa90babd8fc1d2b3e6a7215381a7b2213d6c5ce,0x2eecc0de814cfd8c57ce882babb2e30d1da56621aef7a47f3291cffeaec26ad7,0x280bc02145c155d5833585b6c7b08501055157dd30ce005319621dc462d33b47,0x045132221d1fa0a7f4aed8acd2cbec1e2189b7732ccb2ec272b9c60f0d5afc5b,0x27f427ccbf58a44b1270abbe4eda6ba53bd6ac4d88cf1e00a13c4371ce71d366,0x1617eaae5064f26e8f8a6493ae92bfded7fde71b65df1ca6d5dcec0df70b2cef,0x20c6b400d0ea1b15435703c31c31ee63ad7ba5c8da66cec2796feacea575abca,0x09589ddb438723f53a8e57bdada7c5f8ed67e8fece3889a73618732965645eec,0x0064b6a738a5ff537db7b220f3394f0ecbd35bfd355c5425dc1166bf3236079b,0x095de56281b1d5055e897c3574ff790d5ee81dbc5df784ad2d67795e557c9e9f,0x11cf2e2887aa21963a6ec14289183efe4d4c60f14ecd3d6fe0beebdf855a9b63";
    for (int i = 0; i < levels; i++) {
        String cleanHex = hexZeros.split(",")[i].startsWith("0x") ? hexZeros.split(",")[i].substring(2) : hexZeros.split(",")[i];
        byte[] bytes = hexStringToByteArray(cleanHex);
        zeros.add(bytes);
    }
    long currentIndex = 0;

    String leafHex = "0x28bb28a2c7566e896a177dc7328d4298d197973bcac177fb8291984a1cc43b7f";
    byte[] leafHash = hexStringToByteArray(leafHex.substring(2));

    List<MerklePathNode> path = merkleBuilder.buildMerklePath(leafHash, filledSubtrees, zeros, currentIndex);

    // Print the Merkle path
    System.out.println("Merkle Path:");
    for (MerklePathNode node : path) {
      System.out.println("Path Index: " + node.getPathIndex() + ", Hash: " + bytesToHex(node.getHash()));
    }



    System.out.println("Hello world!");
  }

  public static byte[] hexStringToByteArray(String s) {
    int len = s.length();
    byte[] data = new byte[len / 2];
    for (int i = 0; i < len; i += 2) {
      data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
              + Character.digit(s.charAt(i+1), 16));
    }
    return data;
  }

  private static String bytesToHex(byte[] hash) {
    StringBuilder hexString = new StringBuilder();
    for (byte b : hash) {
      String hex = Integer.toHexString(0xFF & b);
      if (hex.length() == 1) {
        hexString.append('0');
      }
      hexString.append(hex);
    }
    return hexString.toString();
  }


  public static void testPoseidonHash() {
      try {
        // Example inputs
        byte[] aBytes = new byte[]{1};
        byte[] bBytes = new byte[]{0};

        String a = new java.math.BigInteger(1, aBytes).toString();
        String b = new java.math.BigInteger(1, bBytes).toString();

        // Run poseidon.js
        ProcessBuilder builder = new ProcessBuilder("node", "poseidon.js", a, b);
        builder.redirectErrorStream(true);
        Process process = builder.start();


        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        String line;
        String output = null;
        while ((line = reader.readLine()) != null) {
          if (line.startsWith("0x")) {
            output = line;
            break;
          }
        }

        int exitCode = process.waitFor();
        if (exitCode != 0 || output == null) {
          throw new RuntimeException("Poseidon hashing failed");
        }

        System.out.println("Poseidon hash result: " + output);

      } catch (Exception e) {
        e.printStackTrace();
      }
    }
}
