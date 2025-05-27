import * as Comlink from 'comlink';

export default class TodoListWorkerClient {
  worker!: Worker;
  remoteApi: Comlink.Remote<typeof import('./todoListWorker').api>;

  constructor() {
    const worker = new Worker(new URL('./todoListWorker.ts', import.meta.url), {
      type: 'module',
    });
    this.remoteApi = Comlink.wrap(worker);
  }

  async init() {
    await this.remoteApi.init();
  }

  async addTodos(todos: Array<string>) {
    await this.remoteApi.addTodos(todos);
  }

  async completeTodos(indices: Array<number>) {
    await this.remoteApi.completeTodos(indices);
  }

  async getTodo(index: number) {
    return await this.remoteApi.getTodo(index);
  }

  async getTodos() {
    return await this.remoteApi.getTodos();
  }
}
