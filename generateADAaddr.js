//https://github.com/Emurgo/cardano-serialization-lib/blob/master/doc/getting-started/generating-keys.md
//npm i @emurgo/cardano-serialization-lib-nodejs
//npm i bip39
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const {generateMnemonic,mnemonicToEntropy} = require('bip39')

// // Generate the generateMnemonic
// phrases = generateMnemonic()
// console.log(phrases)

//Generate the address
    //Get the rootKey from BIP39 phrase 
const entropy = mnemonicToEntropy(
        'phraseWord');
    
    // console.log('rootKey',rootKey)
const fs = require('fs')
    //Generate addres via rootkey, then write to json file
    function harden(num) {
        return 0x80000000 + num;
      };    
    
function genAddres(count,mnemonic){
    const rootKey = CardanoWasm.Bip32PrivateKey.from_bip39_entropy(
        Buffer.from(mnemonic, 'hex'),
        Buffer.from(''),
      );
    let addressDic = new Object();
    function storeData(data, path){
        try {
                fs.writeFileSync(path, JSON.stringify(data))
            } catch (err) {
                console.error(err)
            }
        }

    for(let i=0; i<count; i++){
        const accountKey = rootKey
        .derive(harden(1852)) // purpose
        .derive(harden(1815)) // coin type
        .derive(harden(i)); // account #0

        const utxo_privkey = accountKey //Private Key
        .derive(0)
        .derive(0); 
        const utxoPubKey = accountKey //UTXO Pub key
        .derive(0) // external
        .derive(0)
        .to_public();
        const stakeKey = accountKey // stake Pub Key
        .derive(2) // chimeric
        .derive(0)
        .to_public();
    
        const baseAddr = CardanoWasm.BaseAddress.new(
            CardanoWasm.NetworkInfo.testnet().network_id(), //CardanoWasm.NetworkInfo.mainnet().network_id() for mainnet
            CardanoWasm.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
            CardanoWasm.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash()),
        );
        const address = baseAddr.to_address().to_bech32();
        const bip32PrivateKey = utxo_privkey.to_bech32();
        // console.log('bip32PrivateKey',bip32PrivateKey);
        addressDic[address] = bip32PrivateKey;
        console.log(address,bip32PrivateKey);

        // // other type address//
        // const stakeAddr = CardanoWasm.RewardAddress.new(
        //     CardanoWasm.NetworkInfo.testnet().network_id(), //CardanoWasm.NetworkInfo.mainnet().network_id() for mainnet
        //     CardanoWasm.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash())
        // );

        // const byronAddr = CardanoWasm.ByronAddress.icarus_from_key(
        //     utxoPubKey, // Ae2* style icarus address
        //     CardanoWasm.NetworkInfo.testnet().protocol_magic()
        //   );


        
        // const enterpriseAddr = CardanoWasm.EnterpriseAddress.new(
        // CardanoWasm.NetworkInfo.testnet().network_id(),
        // CardanoWasm.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash())
        // );

        // const ptrAddr = CardanoWasm.PointerAddress.new(
        //     CardanoWasm.NetworkInfo.testnet().network_id(),
        //     CardanoWasm.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
        //     CardanoWasm.Pointer.new(
        //       100, // slot
        //       2,   // tx index in slot
        //       0    // cert indiex in tx
        //     )
        //   );

        // const rewardAddress = stakeAddr.to_address().to_bech32();
        // const byronAddress_ica = byronAddr.to_address().to_bech32();
        // const byronAddress_de = CardanoWasm.ByronAddress.from_address(CardanoWasm.Address.from_bech32(byronAddress_ica)).to_base58()


        // const enterpriseAddress = enterpriseAddr.to_address().to_bech32();
        // const ptrAddress = ptrAddr.to_address().to_bech32();
        // console.log('BaeseAddress',address,'\n','rewardAddress',rewardAddress,'\n','byronAddress_ica',byronAddress_ica,'\n','byronAddress_de',byronAddress_de,'\n','enterpriseAddress',enterpriseAddress,'\n','ptrAddress',ptrAddress)

    };
    storeData(addressDic,'./addressDic.json')
};
/* Demo
In:
genAddres(5,entropy)

Output:
addr_test1qqhtmxr22g37f4cggjra5zl840q8dfyjrngmfhjq80s5d7cjkpf0fw3vfclu9wqf8cjfq8t49cyvhrqd8c80tejd5grsaxfsy8
addr_test1qzx5mtskg9kapregvq0a5yuluz8753lmu0wy8ankcn7ksg9ujnct2rr6tu395axru06na79nhspw2vnu9desyr5lyn8sce2r7v
addr_test1qzw26t0hsdrpnvq2hmfus600guq7264yk2a0lg9jpep60yj453rqs77e6jzcgx9th4r9d7d323gxu6se7z2hkytyg05qkgjmyl
addr_test1qrqlzz029fdmx36j48q5yqvjc8xp6aacww3jpy2skxmgfq6ymqppga6yujd2rzv0a7vf2h0gqaj7h8ssrlcsekywzessshrfw7
addr_test1qq43v3lh2lypem8dfc09m4c9c5sm2clhp00p26awcqt4sq0mqf99g2cy2r8ujkyjdehu2ap6zp7alf0gu0ayupz7dj5swfdgld
*/

genAddres(50,entropy)



