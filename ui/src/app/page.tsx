'use client';
import { useEffect, useRef, useState } from 'react';

import TodoListWorkerClient from './todoListWorkerClient';
import PendingTodosQueue from '@/components/PendingTodosQueue';
import ProvenTodosQueue from '@/components/ProvenTodosQueue';
import { type TodoObjectRepr } from './todoListWorker';

import App from '@/components/App';
import KawaiiParticles from '@/components/KawaiiParticles';
import KawaiiCard from '@/components/KawaiiCard';
import KawaiiNav from '@/components/KawaiiNav';

export default function Home() {
  const [todoListWorkerClient, setTodoListWorkerClient] =
    useState<TodoListWorkerClient | null>(null);
  const [hasBeenInitialized, setHasBeenInitialized] = useState(false);
  const [workerIsBusy, setWorkerIsBusy] = useState(false);
  const [todoList, setTodoList] = useState<Record<
    number,
    TodoObjectRepr
  > | null>(null);
  const [newTodo, setNewTodo] = useState('');
  const [newTodosQueue, setNewTodosQueue] = useState<string[]>([]);
  const [pendingCompleteTodosQueue, setPendingCompleteTodosQueue] = useState<
    number[]
  >([]);
  const [logMessages, setLogMessages] = useState<string[]>([]);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);

  const initializeWorker = async (worker: TodoListWorkerClient) => {
    setLogMessages((prev) => [...prev, 'Compiling zk program...']);
    const timeStart = Date.now();
    await worker.init();
    const todos = await worker.getTodos();
    setLogMessages((prev) => [
      ...prev,
      `Zk program compiled in ${Date.now() - timeStart}ms`,
    ]);
    setTodoList(todos);
    setHasBeenInitialized(true);
    isInitializingRef.current = false;
  };

  const setup = async () => {
    setWorkerIsBusy(true);
    if (!todoListWorkerClient) {
      setLogMessages((prev) => [
        ...prev,
        'No worker client found, creating new one...',
      ]);
      const workerClient = new TodoListWorkerClient();
      setTodoListWorkerClient(workerClient);
      setLogMessages((prev) => [...prev, 'Worker client created']);
      isInitializingRef.current = true;
      await initializeWorker(workerClient);
    } else if (!hasBeenInitialized && !isInitializingRef.current) {
      isInitializingRef.current = true;
      await initializeWorker(todoListWorkerClient);
    }
    setWorkerIsBusy(false);
  };

  useEffect(() => {
    setup();
  }, [hasBeenInitialized, todoListWorkerClient]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logMessages]);

  const addTodo = async () => {
    setNewTodosQueue([...newTodosQueue, newTodo]);
    setLogMessages((prev) => [
      ...prev,
      `Added todo to pending queue: ${newTodo.substring(0, 10)}...`,
    ]);
    setNewTodo('');
  };

  const resolveTodosQueue = async () => {
    setLogMessages((prev) => [...prev, 'Proving pending todos queue...']);
    setWorkerIsBusy(true);
    const timeStart = Date.now();
    await todoListWorkerClient!.addTodos(newTodosQueue);
    const todos = await todoListWorkerClient!.getTodos();
    setTodoList(todos);
    setWorkerIsBusy(false);
    setLogMessages((prev) => [
      ...prev,
      `Todos queue proven in ${Date.now() - timeStart}ms!`,
    ]);
    setNewTodosQueue([]);
  };

  const completeTodo = async (index: number) => {
    if (!todoList) return;

    setLogMessages((prev) => [
      ...prev,
      `Marking todo ${index} for completion...`,
    ]);
    setPendingCompleteTodosQueue([...pendingCompleteTodosQueue, index]);
  };

  const resolveCompleteTodosQueue = async () => {
    setLogMessages((prev) => [
      ...prev,
      'Proving pending complete todos queue...',
    ]);
    setWorkerIsBusy(true);
    const timeStart = Date.now();
    await todoListWorkerClient!.completeTodos(pendingCompleteTodosQueue);
    const todos = await todoListWorkerClient!.getTodos();
    setTodoList(todos);
    setWorkerIsBusy(false);
    setLogMessages((prev) => [
      ...prev,
      `Complete todos queue proven in ${Date.now() - timeStart}ms!`,
    ]);
    setPendingCompleteTodosQueue([]);
  };

  return (
    <div>
      <KawaiiNav donors={['1', '2', '3']} />
      <KawaiiParticles />
      <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-8 font-[family-name:var(--font-geist-sans)]">
        <main className="flex flex-col gap-x-12 gap-y-40 row-start-2 items-center w-3/4">
          <div className="flex flex-col gap-4 items-center justify-center text-center">
            <h1 className="text-4xl font-bold">
              Todo List with o1js and Next JS!
            </h1>
            <App goal={100} raised={40}></App>
            <div class="grid grid-cols-4 gap-4 pt-4">
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
          <div className="grid grid-cols-2 gap-4">
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
          </div>
        </main>
      </div>
    </div>
  );
}
