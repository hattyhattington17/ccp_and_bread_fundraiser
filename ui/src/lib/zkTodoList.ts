import {
  Bool,
  CircuitString,
  Experimental,
  Field,
  Poseidon,
  SelfProof,
  Struct,
  ZkProgram,
} from 'o1js';

export { IndexedMerkleMap8, Todo, ZkTodoList, ZkTodoListProof };

class IndexedMerkleMap8 extends Experimental.IndexedMerkleMap(8) {}

class Todo extends Struct({
  text: CircuitString,
  status: Bool,
}) {
  hash() {
    return Poseidon.hash([this.text.hash(), this.status.toField()]);
  }
}

const ZkTodoList = ZkProgram({
  name: 'TodoList',
  publicOutput: IndexedMerkleMap8,
  methods: {
    init: {
      privateInputs: [],
      method: async () => {
        const publicOutput = new IndexedMerkleMap8();
        return { publicOutput };
      },
    },
    addTodo: {
      privateInputs: [SelfProof, Field, Todo],
      method: async (
        p: SelfProof<undefined, IndexedMerkleMap8>,
        index: Field,
        todo: Todo,
      ) => {
        p.verify();
        const publicOutput = p.publicOutput.clone();

        publicOutput.insert(index, todo.hash());
        return { publicOutput };
      },
    },
    completeTodo: {
      privateInputs: [SelfProof, Field, Todo],
      method: async (
        p: SelfProof<undefined, IndexedMerkleMap8>,
        index: Field,
        todo: Todo,
      ) => {
        p.verify();
        const publicOutput = p.publicOutput.clone();
        publicOutput.get(index).assertEquals(todo.hash());
        todo.status = Bool(true);
        publicOutput.update(index, todo.hash());
        return { publicOutput };
      },
    },
  },
});

class ZkTodoListProof extends ZkProgram.Proof(ZkTodoList) {}
