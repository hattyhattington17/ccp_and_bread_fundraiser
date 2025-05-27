export default function KawaiiButton(
  buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  return (
    <button
      className="focus:shadow-outline rounded bg-pink-500 px-4 py-2 font-bold text-white hover:bg-pink-700 focus:outline-none mx-1"
      {...buttonProps}
    >
      {buttonProps.children}
    </button>
  );
}
