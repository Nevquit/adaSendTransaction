// https://github.com/Emurgo/cardano-serialization-lib/blob/master/doc/getting-started/generating-transactions.md
// npm i @blockfrost/blockfrost-js
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
const fs = require('fs');
const { BlockFrostAPI } = require('@blockfrost/blockfrost-js');
const { CoinSelection }  = require('./coinSelection'); //Fork from nami wallet

// Prepare precondition 
const blockFrostApi =  new BlockFrostAPI({isTestNet:true,projectId:'testnetfNx5FZ138OOIzj7J1D7B5oYIqNSGASf8'});
const addrsDic = JSON.parse(fs.readFileSync('./addressDic.json'));

// util functions
function buildMetaDataByJson(crossToAddr){
    let itemValue = {
        "fee": 0,
        "type": 1,
        "toAccount": crossToAddr,
        "tokenPairID": 110
      };
  
      let obj ={
        5718350: itemValue
      }
    // let obj ={
    //     1: "0x020012b3b47d607eadf6c6cc5bb83e1791d4426d4a846ee4f02d9e8689f14e0815a70b"
    //   }
    // const metadata = CardanoWasm.encode_json_str_to_metadatum(JSON.stringify(obj), CardanoWasm.MetadataJsonSchema.NoConversions);
  let metadata = CardanoWasm.encode_json_str_to_metadatum(JSON.stringify(obj), CardanoWasm.MetadataJsonSchema.BasicConversions);
  return metadata;
};
function toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
      return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
};
function sleep(time) {
  return new Promise(function(resolve, reject) {
      setTimeout(function() {
          resolve();
      }, time);
  })
}

//**************** UTXO parses ****************************//
async function getUTXO(address){
    const accountUtxos = new Array();
    let rawUtxo = await blockFrostApi.addressesUtxos(address); 
    // console.log(address, JSON.stringify(rawUtxo))
    for(let i=0; i<rawUtxo.length; i++){
        let utxoInfoObj = {"txIn": "","txOut": ""}
        utxoInfoObj.txIn = {
            txId: rawUtxo[i].tx_hash,
            index: rawUtxo[i].tx_index
            };
        utxoInfoObj.txOut = {
            address: address,
            value: rawUtxo[i].amount[0].quantity
            };
        accountUtxos.push(utxoInfoObj);
    }
    // console.log(accountUtxos)
    return accountUtxos
};
async function selectUTXOs(fromAddress,toAddress,amount){
    let selectionParam_inputs = new Array();
    let selectionParam_outputs = CardanoWasm.TransactionOutputs.new();    

    //Org the inputs of coin selection 
    let accountUtxos = await getUTXO(fromAddress);
    // console.log(accountUtxos);
    for(let i=0; i<accountUtxos.length; i++){
      let utxo = accountUtxos[i];
      let txHash = CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.txIn.txId, 'hex'));
      let input = CardanoWasm.TransactionInput.new(txHash, utxo.txIn.index);

      let address = CardanoWasm.Address.from_bech32(utxo.txOut.address);
      let value = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(utxo.txOut.value));
      let output = CardanoWasm.TransactionOutput.new(address, value);

      let selectInputObj = CardanoWasm.TransactionUnspentOutput.new(input, output);
      selectionParam_inputs.push(selectInputObj);
    }
    // console.log('selectionParam_inputs \n',selectionParam_inputs)
    //Org the outputs of coin selection
    let outputAddress = CardanoWasm.Address.from_bech32(toAddress);
    let outputValue = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amount));
    let txOutput = CardanoWasm.TransactionOutput.new(outputAddress, outputValue);
    selectionParam_outputs.add(txOutput);
    // console.log('selectionParam_outputs \n',selectionParam_outputs)


    //Gen the selectedUTXOS
    let selectedUtxos = new Array();
    CoinSelection.setProtocolParameters('1000000', '44', '155381', '10000');
    let selectRsltObj = await CoinSelection.randomImprove(selectionParam_inputs, selectionParam_outputs, 0.1);   
    // console.log('selectRsltObj \n',selectRsltObj)  
    for(let i=0; i<selectRsltObj.input.length; i++){
      let utxoInfoObj = {};       
      let utxo =selectRsltObj.input[i];
      let txIn = utxo.input();
      let txInData = {
        txId: toHexString(txIn.transaction_id().to_bytes()),
        index: txIn.index()
      }
      utxoInfoObj.txIn = txInData;

      let txOut = utxo.output();
      let txOutData = {
        address: txOut.address().to_bech32("addr_test"),
        value: txOut.amount().coin().to_str()
      }
      utxoInfoObj.txOut = txOutData;
      selectedUtxos.push(utxoInfoObj);
    }

    for(let j=0; j<selectRsltObj.output.len(); j++){
      let txOutput = selectRsltObj.output.get(j);
      let address = txOutput.address().to_bech32("addr_test");
      let value = txOutput.amount().coin().to_str();
    //   console.log("*****selectRsltObj output: ", j, address, value);
    }
    // console.log("*****selectRsltObj remaining: ", selectRsltObj.remaining);
    // console.log("*****selectRsltObj amount: ", selectRsltObj.amount.coin().to_str());
    // console.log("*****selectRsltObj change: ", selectRsltObj.change.coin().to_str());
    // console.log('selectedUtxos \n',selectedUtxos)
   return selectedUtxos;
};
//**************** UTXO parses ****************************//

//*********************Build transaction******************//
async function buildTransaction(txBuilder,fromAddress,prvKey_fromAddress,toAddress,amount,changeAddress,crossToAddr){
    const prvBIP32Key = CardanoWasm.Bip32PrivateKey.from_bech32(prvKey_fromAddress);
    const prvKey = prvBIP32Key.to_raw_key()
    
    // const prvKey = prvKey_fromAddress
    let adaToAddress = CardanoWasm.Address.from_bech32(toAddress);
    let adaFromAddress = CardanoWasm.Address.from_bech32(fromAddress);
    let adaChangeAddress = CardanoWasm.Address.from_bech32(changeAddress);


    // Step 1: select the utxos
    let formatBalance = CardanoWasm.BigNum.from_str('0');
    let selectedUtxos =  await selectUTXOs(fromAddress,toAddress, amount);
    // console.log('selectedUtxos================\n',selectedUtxos)

    // Step 2: add tx input to tansaction
    for(let k=0; k<selectedUtxos.length; k++){
        let txIn = selectedUtxos[k].txIn;
        let txOut = selectedUtxos[k].txOut;
        // console.log("txIn: ", txIn);
        // console.log("txOut: ", txOut);

        let txOutAmount = CardanoWasm.BigNum.from_str(txOut.value);
        let txHash = CardanoWasm.TransactionHash.from_bytes(Buffer.from(txIn.txId, "hex"));
        let transactionInput = CardanoWasm.TransactionInput.new(txHash, txIn.index);

        beforeBalance = formatBalance.checked_add(txOutAmount);
        txBuilder.add_input(adaFromAddress, transactionInput, CardanoWasm.Value.new(txOutAmount));
        // console.log("txBuilder add input: ", adaFromAddress, txOutAmount, transactionInput); 
        }
    // console.log("txBuilder finish add input: ");

    // Step 3:  add tx output 
    // console.log("adaToAddress: ", adaToAddress);
    txBuilder.add_output(
        CardanoWasm.TransactionOutput.new(
        adaToAddress,
        CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amount))    
        ),
    );

    // console.log("txBuilder finish add output: ");


    //Step 4: add meta data    
    let rawMetaData = buildMetaDataByJson(crossToAddr); 
    // console.log("buildMetaData: ", rawMetaData);
    let auxiliaryData = CardanoWasm.AuxiliaryData.new(); 
    let genMetaData = CardanoWasm.GeneralTransactionMetadata.from_bytes(rawMetaData.to_bytes());
    auxiliaryData.set_metadata(genMetaData);
    txBuilder.set_auxiliary_data(auxiliaryData);



    //Step 5 : set the time to live - the absolute slot value before the tx becomes invalid
    // txBuilder.set_ttl(48883391);

    //Step 6// once the transaction is ready, we build it to get the tx body without witnesses
    // console.log('adaChangeAddress \n',adaChangeAddress)
    txBuilder.add_change_if_needed(adaChangeAddress)

    const txBody = txBuilder.build();
    const txHash = CardanoWasm.hash_transaction(txBody);
    const witnesses = CardanoWasm.TransactionWitnessSet.new();

    //Step 7 / add keyhash witnesses
    const vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
    const vkeyWitness = CardanoWasm.make_vkey_witness(txHash, prvKey);
    vkeyWitnesses.add(vkeyWitness);
    witnesses.set_vkeys(vkeyWitnesses);

    //Step9: create the finalized transaction with witnesses
    // console.log("setMetadata is done");

    const transaction = CardanoWasm.Transaction.new(
    txBody,
    witnesses,
    auxiliaryData, // transaction metadata
    );
    return transaction
};

//******************Submit the transaction *******************/
async function submit(signedTx){
    let txHash = await blockFrostApi.txSubmit(signedTx.to_bytes()); //"2a24e9f37448dcdb74e24ff98b3831e64f82418df2d3da6426a3f824f91064b9";//
    return txHash
};
async function getTxStatus(tx){
    let res = await blockFrostApi.txs(tx); //"2a24e9f37448dcdb74e24ff98b3831e64f82418df2d3da6426a3f824f91064b9";//
    return res

}
//****************** mian***************************** */
async function Cross(){
    const fromAddressArr = Object.keys(addrsDic)
    for (j = 0; j < 20; j++) {
      try {
        let txBuilder = CardanoWasm.TransactionBuilder.new(
          // all of these are taken from the mainnet genesis settings
          // linear fee parameters (a*size + b)
          CardanoWasm.LinearFee.new(CardanoWasm.BigNum.from_str('44'), CardanoWasm.BigNum.from_str('155381')),
          // minimum utxo value
          CardanoWasm.BigNum.from_str('1000000'),
          // pool deposit
          CardanoWasm.BigNum.from_str('500000000'),
          // key deposit  
          CardanoWasm.BigNum.from_str('2000000'),
          1000,
          10000
      );
        let fromAddress = fromAddressArr[j]
        let prvKey_fromAddress = addrsDic[fromAddress]
        let toAddress = 'addr_test1qz3ga6xtwkxn2aevf8jv0ygpq3cpseen68mcuz2fqe3lu0s9ag8xf2vwvdxtt6su2pn6h7rlnnnsqweavyqgd2ru3l3q09lq9e'; //storeman address
        // console.log(toAddress)
        let crossToAddr = '0x8b157b3ffead48c8a4cdc6bddbe1c1d170049da4';
        let amount = '1000000'; // Lovelace , 1 ADA = 1,000,000 Lovelace
        let changeAddress = fromAddress;
        // console.log(toAddress)
        let signedTx = await buildTransaction(txBuilder,fromAddress,prvKey_fromAddress,toAddress,amount,changeAddress,crossToAddr);
        let txHash = await submit(signedTx);
        console.log('txHash: ', j, txHash);
        // sleep(10)
      } catch (error) {
        console.log('error===============',error)
      }


    }

}

Cross()
// async function gettx(txhash){
//     tx = await blockFrostApi.txs(txhash);
//     console.log('txhash',tx)
// }
// gettx('c68c59f904b17eab9d91c49c65ea57cb4ab8e8e8b366822708435083ac81d5a9')
// // getUTXO('addr_test1qq7vavvs05x70fleg7rhhfzppa78w8xfh7f28f5rs4pulxq7rqzzk0mhvnteup76edzynkxtavju66h86ha08ep83zgs048250')