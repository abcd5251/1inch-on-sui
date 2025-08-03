"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ArrowsRightLeftIcon, BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-center mb-6">
              <span className="block text-3xl mb-3 text-primary font-bold">1inch-on-Sui</span>
              <span className="block text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Cross-Chain Atomic Swaps
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Extending 1inch Fusion+ protocol to Sui blockchain with MEV-protected trading through HTLC mechanisms. 
              Experience secure, bridge-free atomic swaps between Ethereum and Sui.
            </p>
          </div>

          <div className="flex justify-center items-center space-x-2 flex-col mb-8">
            <p className="my-2 font-medium">Connected Ethereum Address:</p>
            <Address address={connectedAddress} />
          </div>

          <div className="text-center mb-8">
            <Link href="/fusion/swap" passHref>
              <button className="btn btn-primary btn-lg mr-4">
                Start Cross-Chain Swap
              </button>
            </Link>
            <Link href="/fusion/auctions" passHref>
              <button className="btn btn-secondary btn-lg mr-4">
                Live Auctions
              </button>
            </Link>
            <Link href="/fusion" passHref>
              <button className="btn btn-outline btn-lg">
                Fusion Dashboard
              </button>
            </Link>
          </div>
        </div>

        <div className="grow bg-gradient-to-br from-base-200 to-base-300 w-full mt-16 px-8 py-12">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="flex flex-col bg-base-100 px-8 py-8 text-center items-center rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <ArrowsRightLeftIcon className="h-12 w-12 fill-primary mb-4" />
                <h3 className="text-xl font-bold mb-3">Cross-Chain Swaps</h3>
                <p className="text-gray-600">
                  Bridge-free atomic swaps between Ethereum and Sui using{" "}
                  <Link href="/fusion" passHref className="link link-primary">
                    1inch Fusion+
                  </Link>{" "}
                  with HTLC security.
                </p>
              </div>
              
              <div className="flex flex-col bg-base-100 px-8 py-8 text-center items-center rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-4xl mb-4">🛡️</div>
                <h3 className="text-xl font-bold mb-3">MEV Protection</h3>
                <p className="text-gray-600">
                  Advanced MEV protection through Dutch auction mechanisms and resolver competition for optimal execution.
                </p>
              </div>

              <div className="flex flex-col bg-base-100 px-8 py-8 text-center items-center rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold mb-3">Real-Time Monitoring</h3>
                <p className="text-gray-600">
                  Live auction tracking, WebSocket updates, and comprehensive transaction monitoring across both chains.
                </p>
              </div>

              <div className="flex flex-col bg-base-100 px-8 py-8 text-center items-center rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <BugAntIcon className="h-12 w-12 fill-secondary mb-4" />
                <h3 className="text-xl font-bold mb-3">Developer Tools</h3>
                <p className="text-gray-600">
                  Debug smart contracts and test cross-chain functionality with{" "}
                  <Link href="/debug" passHref className="link link-secondary">
                    integrated debugging tools
                  </Link>.
                </p>
              </div>

              <div className="flex flex-col bg-base-100 px-8 py-8 text-center items-center rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <MagnifyingGlassIcon className="h-12 w-12 fill-secondary mb-4" />
                <h3 className="text-xl font-bold mb-3">Block Explorer</h3>
                <p className="text-gray-600">
                  Explore transactions and monitor blockchain activity with the{" "}
                  <Link href="/blockexplorer" passHref className="link link-secondary">
                    integrated block explorer
                  </Link>.
                </p>
              </div>

              <div className="flex flex-col bg-base-100 px-8 py-8 text-center items-center rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="text-4xl mb-4">🔗</div>
                <h3 className="text-xl font-bold mb-3">Dual Wallet Support</h3>
                <p className="text-gray-600">
                  Seamless integration with both Ethereum (RainbowKit) and Sui wallets for true cross-chain experience.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
