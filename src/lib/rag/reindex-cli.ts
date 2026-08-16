import "dotenv/config";
import { prisma } from "../prisma";
import { reindexKnowledge } from "./index";

async function main() {
  console.log("Reindexing knowledge chunks…");
  const result = await reindexKnowledge();
  if (!result.ok) {
    console.error(`Failed (${result.reason}): ${result.message}`);
    process.exit(1);
  }
  console.log(`Indexed ${result.count} knowledge chunks.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
