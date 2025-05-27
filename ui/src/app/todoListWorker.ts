import { Bool, CircuitString, Field } from 'o1js';
import * as Comlink from 'comlink';
import {
  IndexedMerkleMap8,
  Todo,
  ZkTodoList,
  ZkTodoListProof,
} from '../lib/zkTodoList';

export type TodoObjectRepr = {
  text: string;
  status: boolean;
};

const state = {
  merkleMap: null as IndexedMerkleMap8 | null,
  objectRepr: {} as Record<number, TodoObjectRepr>,
  proof: null as ZkTodoListProof | null,
  index: 0,
};

export const api = {
  async init() {
    console.time('Compiling zkTodoList');
    await ZkTodoList.compile();
    console.timeEnd('Compiling zkTodoList');
    const initialProof = await ZkTodoList.init();
    state.proof = initialProof.proof;
    state.merkleMap = initialProof.proof.publicOutput;
  },
  async addTodos(todos: Array<string>) {
    if (!state.proof) {
      throw new Error('Proof not initialized');
    }
    let i = 0;
    while (todos.length > 0) {
      const text = todos.shift()!;
      console.log('Adding todo', i, text);
      const todo = new Todo({
        text: CircuitString.fromString(text),
        status: Bool(false),
      });
      const index = Field(state.index + 1);
      const proof = await ZkTodoList.addTodo(state.proof, index, todo);
      state.merkleMap = proof.proof.publicOutput;
      state.index++;
      i++;
      state.objectRepr[state.index] = { text, status: false };
      state.proof = proof.proof;
    }
  },
  async completeTodo(index: number) {
    if (!state.proof || !state.merkleMap) {
      throw new Error('Proof not initialized');
    }
    try {
      const todoHash = state.merkleMap.get(Field(index));

      console.log('Completing todo', index, todoHash);
    } catch {
      throw new Error('Todo not found');
    }

    const todoRepr = state.objectRepr[index];
    if (!todoRepr) {
      throw new Error('Todo not found');
    }
    if (todoRepr.status) {
      throw new Error('Todo already completed');
    }

    const todo = new Todo({
      text: CircuitString.fromString(todoRepr.text),
      status: Bool(todoRepr.status),
    });

    const text = todo.text.toString();
    const proof = await ZkTodoList.completeTodo(
      state.proof,
      Field(index),
      new Todo({
        text: CircuitString.fromString(text),
        status: Bool(false),
      }),
    );
    todoRepr.status = true;
    state.merkleMap = proof.proof.publicOutput;
    state.objectRepr[index] = todoRepr;
    state.proof = proof.proof;
  },
  async completeTodos(indices: Array<number>) {
    for (const index of indices) {
      console.log('Completing todo', index);
      await this.completeTodo(index);
    }
  },
  getTodo(index: number) {
    return state.objectRepr[index];
  },
  getTodos() {
    return state.objectRepr;
  },
};

Comlink.expose(api);
