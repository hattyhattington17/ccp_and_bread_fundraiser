'use client';
import { useEffect, useRef, useState } from 'react';

import FundraiserWorkerClient from './fundraiserWorkerClient';

import App from '@/components/App';
import KawaiiParticles from '@/components/KawaiiParticles';
import KawaiiCard from '@/components/KawaiiCard';
import KawaiiNav from '@/components/KawaiiNav';
import { Mina, PrivateKey } from 'o1js';
import { MerkleMap4 } from '@/lib/Fundraiser';

const local = await Mina.LocalBlockchain({
  proofsEnabled: false,
  enforceTransactionLimits: false,
});
Mina.setActiveInstance(local);

const [deployer, beneficiary, matt, katie, christian] = local.testAccounts;
const tokenKeys = PrivateKey.randomKeypair();
const fundraiserKeys = PrivateKey.randomKeypair();

const personaMap = new Map([
  [matt, 'matt'],
  [katie, 'katie'],
  [christian, 'christian'],
  [deployer, 'deployer'],
  [beneficiary, 'beneficiary'],
]);

export default function Home() {
  const [fundraiserWorkerClient, setFundraiserWorkerClient] =
    useState<FundraiserWorkerClient | null>(null);
  const [selectedPersona, setSelectedPersona] =
    useState<Mina.TestPublicKey>(deployer);
  const [hasBeenInitialized, setHasBeenInitialized] = useState(false);
  const [workerIsBusy, setWorkerIsBusy] = useState(false);
  const [donorList, setDonorList] = useState<MerkleMap4 | null>(null);
  const [amountToDonate, setAmountToDonate] = useState(0n);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);

  async function withBusyWorker<T>(job: () => Promise<T>): Promise<T> {
    setWorkerIsBusy(true);
    let ret: T;
    try {
      ret = await job();
    } catch (error) {
      setLogMessages((prev) => [...prev, `ERROR: ${error}`]);
      throw error;
    } finally {
      setWorkerIsBusy(false);
    }
    return ret;
  }

  const initializeWorker = async (worker: FundraiserWorkerClient) => {
    setLogMessages((prev) => [...prev, 'Compiling zk program...']);
    const timeStart = Date.now();
    await worker.init(fundraiserKeys.publicKey, tokenKeys.publicKey, deployer);
    const donors = await worker.getDonors();
    setLogMessages((prev) => [
      ...prev,
      `Zk program compiled in ${Date.now() - timeStart}ms`,
    ]);
    setDonorList(donors);
    setHasBeenInitialized(true);
    isInitializingRef.current = false;
  };

  const setup = async () => {
    await withBusyWorker(async () => {
      if (!fundraiserWorkerClient) {
        setLogMessages((prev) => [
          ...prev,
          'No worker client found, creating new one...',
        ]);
        const workerClient = new FundraiserWorkerClient();
        setFundraiserWorkerClient(workerClient);
        setLogMessages((prev) => [...prev, 'Worker client created']);
        isInitializingRef.current = true;
        await initializeWorker(workerClient);
      } else if (!hasBeenInitialized && !isInitializingRef.current) {
        isInitializingRef.current = true;
        await initializeWorker(fundraiserWorkerClient);
      }
    });
  };

  useEffect(() => {
    setup();
  }, [hasBeenInitialized, fundraiserWorkerClient]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logMessages]);

  const donate = () => {
    withBusyWorker(
      async () =>
        await fundraiserWorkerClient?.donate(selectedPersona, {
          address: selectedPersona.x,
          amount: amountToDonate,
        }),
    );

    setLogMessages((prev) => [
      ...prev,
      `${personaMap.get(selectedPersona)} (${selectedPersona.toBase58().substring(0, 10)}...): donated ${amountToDonate}.`,
    ]);
    setAmountToDonate(0n);
  };

  const claim = () => {
    withBusyWorker(
      async () => await fundraiserWorkerClient?.claim(selectedPersona),
    );

    setLogMessages((prev) => [
      ...prev,
      `${personaMap.get(selectedPersona)} (${selectedPersona.toBase58().substring(0, 10)}...): attempted claim.`,
    ]);
  };

  const reclaim = () => {
    withBusyWorker(
      async () => await fundraiserWorkerClient?.refund(selectedPersona),
    );

    setLogMessages((prev) => [
      ...prev,
      `${personaMap.get(selectedPersona)} (${selectedPersona.toBase58().substring(0, 10)}...): attempted refund.`,
    ]);
  };

  return (
    <div>
      <KawaiiNav
        setSelected={setSelectedPersona}
        deployer={deployer}
        beneficiary={beneficiary}
        donors={[matt, katie, christian]}
        personaMap={personaMap}
      />
      <KawaiiParticles />
      <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-8 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col gap-x-12 gap-y-40 row-start-2 items-center w-3/4">
          <div className="flex flex-col gap-4 items-center justify-center text-center">
            <h1 className="text-4xl font-bold">
              Fundraiser with o1js and Next JS!
            </h1>
            <App
              goal={100n}
              raised={40n}
              onDonate={donate}
              onClaim={claim}
              onReclaim={reclaim}
              claimant={beneficiary}
              onAmountToDonateChanged={setAmountToDonate}
              buttonsActive={!workerIsBusy && hasBeenInitialized}
            />
            <div className="grid grid-cols-4 gap-4 pt-4">
              <KawaiiCard
                emoji="📚"
                href="https://docs.minaprotocol.com/zkapps"
                cardTitle="DOCS"
                cardText="Explore zkApps and how to build one"
              />
              <KawaiiCard
                emoji="🛠️"
                href="https://docs.minaprotocol.com/zkapps/tutorials/hello-world"
                cardTitle="TUTORIALS"
                cardText="Learn with step-by-step o1js tutorials"
              />
              <KawaiiCard
                emoji="💬"
                href="https://discord.gg/minaprotocol"
                cardTitle="QUESTIONS"
                cardText="Ask questions on our Discord server"
              />
              <KawaiiCard
                emoji="🚀"
                href="https://docs.minaprotocol.com/zkapps/how-to-deploy-a-zkapp"
                cardTitle="DEPLOY"
                cardText="Deploy your zkApp to Testnet"
              />
            </div>

            <p>
              This is a demo site built with o1js and Next JS. Follow along with
              step by step instructions for how to build this site{' '}
              <a href="#">here</a>!
            </p>
          </div>
          <div className="w-full">
            <h2 className="text-xl font-bold mb-2">Console Log</h2>
            <div
              ref={logContainerRef}
              className="w-full max-h-40 overflow-y-auto bg-gray-100 p-4 rounded-lg"
            >
              <ul className="list-disc list-inside">
                {logMessages.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
          {/* <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              <div className="py-8">
                <PendingTodosQueue
                  title="Pending Todos Queue"
                  subheading="These todo items are only represented in Javascript. Click 'Pending Todos Queue' to prove their inclusion"
                  todos={newTodosQueue}
                />
                <input
                  type="text"
                  className="input"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                />
                <button onClick={addTodo} className="mx-2 btn">
                  Add Todo
                </button>
                <button
                  className="btn"
                  onClick={resolveTodosQueue}
                  disabled={workerIsBusy || !hasBeenInitialized}
                >
                  Prove Pending Todos Queue
                </button>
              </div>
              <div>
                <PendingTodosQueue
                  title="Pending Complete Todos Queue"
                  subheading="These todo items marked for completion in javascript, but not yet proven.  Click 'Pending Complete Todos Queue' to prove their completion"
                  todos={pendingCompleteTodosQueue.map(
                    (index) => todoList![index].text,
                  )}
                />
                <button
                  className="btn"
                  onClick={resolveCompleteTodosQueue}
                  disabled={workerIsBusy || !hasBeenInitialized}
                >
                  Prove Pending Complete Todos Queue
                </button>
              </div>
            </div>
          <div>
              {hasBeenInitialized ? (
                todoList !== null && (
                  <ul className="flex flex-col gap-2">
                    <ProvenTodosQueue
                      title="Proven Todos Queue"
                      subheading="These todo items are represented in the current proof"
                      todos={todoList}
                      completeTodo={completeTodo}
                    />
                  </ul>
                )
              ) : (
                <div>Waiting for zk circuit to compile...</div>
              )}
            </div>
      </div> */}
        </main>
      </div>
    </div>
  );
}
