"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { useAccount, useChainId } from "wagmi";
import { getGenLayerClient, CONTRACT_ADDRESS } from "@/lib/genlayer";
import { genLayerStudioNet } from "@/lib/wagmiConfig";

export function useGenLayer() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [client, setClient] = useState<any>(null);
  const [isContractDeployed, setIsContractDeployed] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!isConnected || chainId !== genLayerStudioNet.id) {
      const t = setTimeout(() => {
        setClient(null);
        setIsContractDeployed(null);
      }, 0);
      return () => clearTimeout(t);
    }

    const initClient = async () => {
      setIsChecking(true);
      try {
        const glClient = getGenLayerClient(address);
        
        // Wrap read call in try/catch to gracefully handle ResourceNotFoundRpcError
        try {
          // We can call get_all_claims to check if contract exists
          await glClient.readContract({
            address: CONTRACT_ADDRESS,
            functionName: "get_all_claims",
            args: []
          });
          setIsContractDeployed(true);
          setClient(glClient);
        } catch (err: any) {
          if (err.message?.includes("not found") || err.message?.includes("ResourceNotFound")) {
            setIsContractDeployed(false);
          } else {
            // Re-throw or ignore other errors, maybe it exists but reverted
            setIsContractDeployed(true); 
            setClient(glClient);
          }
        }
      } catch (e: any) {
        // Suppress expected errors during polling when the contract is not found or storage is empty
        if (
          !e?.message?.includes("ResourceNotFoundRpcError") && 
          !e?.message?.includes("execution failed") && 
          !e?.message?.includes("not found")
        ) {
          console.error("Failed to init GenLayer client", e);
        }
      } finally {
        setIsChecking(false);
      }
    };

    initClient();
  }, [isConnected, chainId, address]);

  const isReady = isConnected && chainId === genLayerStudioNet.id && isContractDeployed === true;

  return {
    client,
    isReady,
    isChecking,
    isContractDeployed,
    isConnected,
    isWrongNetwork: isConnected && chainId !== genLayerStudioNet.id
  };
}
