import { TodoObjectRepr } from '@/app/todoListWorker';
import ProvenTodoItem from './ProvenTodoItem';

export default function ProvenTodosQueue({
  title,
  subheading,
  todos,
  completeTodo,
}: {
  title: string;
  subheading: string;
  todos: Record<number, TodoObjectRepr>;
  completeTodo: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 w-3/4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p>{subheading}</p>
      <li className="flex flex-row items-center gap-4 p-2 border-b border-gray-200">
        <div className="flex-1">
          <p>Todo</p>
        </div>
        <div className="flex-1">
          <p>Status</p>
        </div>
        <div>
          <p>Index</p>
        </div>
        <div className="flex-1 text-right">
          <p>Actions</p>
        </div>
      </li>
      <ul className="flex flex-col gap-2">
        {Object.entries(todos).map(([index, todo]) => {
          console.log(index, todo);
          return (
            <ProvenTodoItem
              key={index}
              todo={todo}
              index={Number(index)}
              completeTodo={completeTodo}
            />
          );
        })}
      </ul>
    </div>
  );
}
