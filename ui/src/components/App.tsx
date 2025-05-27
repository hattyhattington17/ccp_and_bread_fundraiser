import { Mina, UInt64 } from 'o1js';
import { useState } from 'react';
import KawaiiButton from './KawaiiButton';
import character from '@/assets/character.png';

export type AppProps = {
  goal: bigint;
  raised: bigint;
  claimant: Mina.TestPublicKey;
  donator: Mina.TestPublicKey;
  onDonate: (donator: Mina.TestPublicKey, amount: UInt64) => void;
  onClaim: (claimant: Mina.TestPublicKey, amount: UInt64) => void;
  onReclaim: (reclaimant: Mina.TestPublicKey) => void;
};

export default function App({
  goal,
  raised,
  claimant,
  donator,
  onDonate,
}: AppProps) {
  const [amount, setAmount] = useState<bigint>(0n);

  return (
    <form className="w-full max-w-sm rounded-xl bg-pink-100/90 p-4 shadow-md">
      <a
        href="https://minaprotocol.com/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img
          src={character.src}
          alt="Character portrait"
          width="72"
          height="72"
        />
      </a>
      <div className="my-2">
        <input
          type="number"
          className="rounded-sm"
          placeholder="Amount to donate"
          aria-label="Amount to donate"
          onInput={(e) => setAmount(BigInt(e.currentTarget.value))}
          required
        />
        <p className="my-2">{goal - raised} to goal!</p>
      </div>
      <KawaiiButton
        type="button"
        onClick={() => onDonate(donator, UInt64.from(amount))}
      >
        Donate
      </KawaiiButton>
      <button
        type="button"
        className="focus:shadow-outline rounded bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-700 focus:outline-none mx-1"
      >
        Reclaim
      </button>
      <button
        type="button"
        className="focus:shadow-outline rounded bg-gray-500 px-4 py-2 font-bold text-white hover:bg-gray-700 focus:outline-none mx-1"
      >
        Claim
      </button>
    </form>
  );
}
