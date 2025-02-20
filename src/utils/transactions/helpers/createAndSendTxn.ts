import { WalletContextState } from '@solana/wallet-adapter-react';
import { web3 } from 'hadeswap-sdk';

import { NotifyType } from '../../solanaUtils';
import { notify } from '../..';

interface CreateAndSendTransactionProps {
  txInstructions: web3.TransactionInstruction[];
  additionalSigners?: web3.Signer[];
  commitment?: web3.Commitment;
  connection: web3.Connection;
  wallet: WalletContextState;
  onBeforeApprove?: () => void;
  onAfterSend?: () => void;
}

type CreateAndSendTxn = (props: CreateAndSendTransactionProps) => Promise<void>;

export const createAndSendTxn: CreateAndSendTxn = async ({
  txInstructions,
  connection,
  wallet,
  onAfterSend,
  onBeforeApprove,
  additionalSigners = [],
  commitment = 'finalized',
}) => {
  onBeforeApprove?.();

  console.log(txInstructions, additionalSigners)

  const { blockhash } = await connection.getLatestBlockhash(commitment);

  const lookupTable = (
    await connection.getAddressLookupTable(
      new web3.PublicKey(process.env.LOOKUP_TABLE_PUBKEY),
    )
  ).value;

  if (!lookupTable) return;

  const messageV0 = new web3.TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: txInstructions,
  }).compileToV0Message([lookupTable]);

  const transaction = new web3.VersionedTransaction(messageV0);

  const signedTransaction = await wallet.signTransaction(transaction);
  signedTransaction.sign([...additionalSigners]);

  onAfterSend?.();

  await connection.sendTransaction(transaction, {
    maxRetries: 5,
    skipPreflight: false,
  });

  notify({
    message: 'Transaction sent',
    type: NotifyType.INFO,
  });

  // await connection.confirmTransaction({
  //   signature: txid,
  //   blockhash,
  //   lastValidBlockHeight,
  // });
};
