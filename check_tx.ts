import { createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { handleDeploymentReceipt } from "./scripts/receipt.js";

const client = createClient({ chain: studioDevnet });

client.getTransaction({ hash: "0x53996698dfdd952cf70d13452bbdd58ceb945c410bb5243af61c3b33d73c21ea" }).then(tx => {
    console.dir(tx, {depth: null});
    console.log(handleDeploymentReceipt(tx as any));
});
