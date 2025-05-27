import KawaiiButton from './KawaiiButton';

import { Mina } from 'o1js';

export type KawaiiNavProps = {
  donors: Mina.TestPublicKey[];
  deployer: Mina.TestPublicKey;
  beneficiary: Mina.TestPublicKey;
  setSelected: (selected: Mina.TestPublicKey) => void;
};

export default function KawaiiNav({
  donors,
  deployer,
  beneficiary,
  setSelected,
}: KawaiiNavProps) {
  return (
    <nav className="flex w-full items-center justify-between bg-pink-100/90 p-4 shadow-md">
      <div>
        <KawaiiButton type="button" onClick={() => setSelected(deployer)}>
          Deployer
        </KawaiiButton>
        <KawaiiButton type="button" onClick={() => setSelected(beneficiary)}>
          Beneficiary
        </KawaiiButton>
        {donors.map((donor, idx) => (
          <KawaiiButton
            // key={donor.toBase58()}
            type="button"
            onClick={() => setSelected(donor)}
          >
            {`Donor ${idx + 1}`}
          </KawaiiButton>
        ))}
      </div>
    </nav>
  );
}
