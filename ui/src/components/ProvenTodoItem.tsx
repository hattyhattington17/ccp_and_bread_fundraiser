import { type TodoObjectRepr } from '@/app/todoListWorker';

export default function ProvenTodoItem({
  todo,
  index,
  completeTodo,
}: {
  todo: TodoObjectRepr;
  index: number;
  completeTodo: (index: number) => void;
}) {
  return (
    <li className="flex flex-row items-center gap-4 p-2 border-b border-gray-200">
      <div className="flex-1">
        <p>{todo.text}</p>
      </div>
      <div className="flex-1">
        <p>{todo.status ? '✅' : '❌'}</p>
      </div>
      <div>
        <p>{index}</p>
      </div>
      <div className="flex-1 text-right">
        {todo.status ? (
          <p>Already complete!</p>
        ) : (
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
            onClick={() => completeTodo(index)}
          >
            Complete
          </button>
        )}
      </div>
    </li>
  );
}
