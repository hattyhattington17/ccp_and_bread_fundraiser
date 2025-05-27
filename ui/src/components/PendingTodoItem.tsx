export default function PendingTodoItem({ todo }: { todo: string }) {
  return (
    <li className="flex flex-row items-center gap-4 p-2 border-b border-gray-200">
      <div className="flex-1">
        <p>{todo}</p>
      </div>
    </li>
  );
}
