import KawaiiButton from './KawaiiButton';

import { Mina } from 'o1js';

export type KawaiiNavProps = {
  donors: Mina.TestPublicKey[];
  deployer: Mina.TestPublicKey;
  beneficiary: Mina.TestPublicKey;
  setSelected: (selected: Mina.TestPublicKey) => void;
  personaMap: Map<Mina.TestPublicKey, string>;
};

export default function KawaiiNav({
  donors,
  deployer,
  beneficiary,
  setSelected,
  personaMap,
}: KawaiiNavProps) {
  return (
    <nav className="w-full items-center justify-between bg-pink-100/90 p-4 shadow-md">
      <KawaiiButton type="button" onClick={() => setSelected(deployer)}>
        Deployer
      </KawaiiButton>
      <KawaiiButton type="button" onClick={() => setSelected(beneficiary)}>
        Beneficiary
      </KawaiiButton>
      {donors.map((donor) => (
        <KawaiiButton
          // key={donor.toBase58()}
          type="button"
          onClick={() => setSelected(donor)}
          key={donor.toBase58()}
        >
          {personaMap.get(donor)}
        </KawaiiButton>
      ))}
    </nav>
  );
}
