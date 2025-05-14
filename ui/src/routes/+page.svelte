
<script lang="ts">
  import character from '$lib/assets/kawaii/character.png'
  import arrowRightSmall from '$lib/assets/arrow-right-small.svg'
  import { onMount } from 'svelte'
  import { Mina, PublicKey } from 'o1js'
	import type { MerkleMap, Fundraiser } from '$lib/contracts/Fundraiser.ts';
  import { serializeIndexedMap, deserializeIndexedMerkleMap } from '@minatokens/storage'
  const storage_provider_address = "http://localho.st:3000"

  export let amount = 40;
  export let goal = 100;
  export let raised = 20;

  async function getDonorMap() {
    return fetch(`${storage_provider_address}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
   })
  }

  async function writeDonorMap(m: MerkleMap) {
    return fetch(`${storage_provider_address}/write`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(serializeIndexedMap(m)),
    })
  }
  
  onMount(async () => {

    // Update this to use the address (public key) for your zkApp account.
    // To try it out, you can try this address for an example "Add" smart contract that we've deployed to
    // Testnet B62qnTDEeYtBHBePA4yhCt4TCgDtA4L2CGvK7PirbJyX4pKH8bmtWe5 .
    const zkAppAddress = ''
    // This should be removed once the zkAppAddress is updated.
    if (!zkAppAddress) {
      console.error(
        'The following error is caused because the zkAppAddress has an empty string as the public key. Update the zkAppAddress with the public key for your zkApp account, or try this address for an example "Add" smart contract that we deployed to Testnet: B62qnTDEeYtBHBePA4yhCt4TCgDtA4L2CGvK7PirbJyX4pKH8bmtWe5',
      )
    }

    let donorMap = await getDonorMap()
    console.log(donorMap);

    //const zkApp = new Add(PublicKey.fromBase58(zkAppAddress))
  })

</script>

<svelte:head>
  <title>Mina Crowdfunding UI</title>
</svelte:head>
<div class="h-screen bg-gradient-to-br from-[#f9f9f9] to-[#ff55ff]">
  <main class="flex flex-col items-center gap-6">
    <h1 class="text-4xl font-bold text-center">
      Mina Fungible Token Crowdfunding Example
    </h1>

    <form class="flex flex-row bg-black/20 p-6 rounded-xl shadow-lg">
      <a
        href="https://minaprotocol.com/"
        target="_blank"
        rel="noopener noreferrer">
        <img
          src={character}
          alt="Character portrait"
          width="72"
          height="72"
          priority />
      </a>
    <div>
      <input
        type="number"
        class="rounded-lg"
        placeholder="Amount to donate"
        aria-label="Amount to donate"
        on:input={e => (amount = e.target.value)}
        required />
      <p>{goal - raised} to goal!</p>
      
    </div>
    </form>
    <p class="start">
      Welcome to the Mina zkApp UI!
    </p>
    <div class="grid">
      <a
        href="https://docs.minaprotocol.com/zkapps"
        class="card"
        target="_blank"
        rel="noopener noreferrer">
        <h2>
          <span>DOCS</span>
          <div>
            <img
              src={arrowRightSmall}
              alt="Mina Logo"
              width={16}
              height={16}
              priority />
          </div>
        </h2>
        <p>Explore zkApps, how to build one, and in-depth references</p>
      </a>
      <a
        href="https://docs.minaprotocol.com/zkapps/tutorials/hello-world"
        class="card"
        target="_blank"
        rel="noopener noreferrer">
        <h2>
          <span>TUTORIALS</span>
          <div>
            <img
              src={arrowRightSmall}
              alt="Mina Logo"
              width={16}
              height={16}
              priority />
          </div>
        </h2>
        <p>Learn with step-by-step o1js tutorials</p>
      </a>
      <a
        href="https://discord.gg/minaprotocol"
        class="card"
        target="_blank"
        rel="noopener noreferrer">
        <h2>
          <span>QUESTIONS</span>
          <div>
            <img
              src={arrowRightSmall}
              alt="Mina Logo"
              width={16}
              height={16}
              priority />
          </div>
        </h2>
        <p>Ask questions on our Discord server</p>
      </a>
      <a
        href="https://docs.minaprotocol.com/zkapps/how-to-deploy-a-zkapp"
        class="card"
        target="_blank"
        rel="noopener noreferrer">
        <h2>
          <span>DEPLOY</span>
          <div>
            <img
              src={arrowRightSmall}
              alt="Mina Logo"
              width={16}
              height={16}
              priority />
          </div>
        </h2>
        <p>Deploy a zkApp to Testnet</p>
      </a>
    </div>
  </main>
</div>

