from web3 import Web3
import json
import sys
class ETH_Sign():
    def __init__(self,node,from_addr,chainid,pri):
        self.w3 = Web3(Web3.HTTPProvider(node))
        self.from_addr = from_addr
        self.chainid = chainid
        self.pri = pri

    def signEthNormalTx(self,to_addr,value):

        signed_txn = self.w3.eth.account.signTransaction(
            {
                'nonce': self.w3.eth.getTransactionCount(Web3.toChecksumAddress(self.from_addr))+1,
                'gasPrice': Web3.toWei(21, 'gwei'),
                'from': Web3.toChecksumAddress(self.from_addr),
                'gas': 210000,
                'to': Web3.toChecksumAddress(to_addr),
                'chainId': self.chainid, #https://medium.com/coinmonks/ethereum-test-network-21baa86072fa
                'value': Web3.toWei(value, 'ether')
            },
            self.pri
        )
        signed_data = signed_txn.rawTransaction
        return signed_data

    def signEthContractTx(self,contract_addr,contract_abi,func,args,value,nonce):
        '''
        :param node:
        :parameter args:list,function: function name
        :param contract_addr:
        :param abi: dictionary
        :param from_addr:
        :param prikey:
        :return:
        '''
        contract_addr = Web3.toChecksumAddress(contract_addr.lower())
        abi = contract_abi
        contract = self.w3.eth.contract(address=contract_addr, abi=abi)
        value = Web3.toWei(value, 'ether') #win
        payload = contract.encodeABI(fn_name=func, args=args)
        raw_data = {'from': Web3.toChecksumAddress(self.from_addr),'to':contract_addr,'gasPrice': Web3.toWei(230, 'gwei'),'gas': 1000000,'nonce':nonce,'value':value,'data':payload,'chainId':self.chainid}
        signed_txn = self.w3.eth.account.signTransaction(raw_data,self.pri)
        signed_data = signed_txn.rawTransaction
        return signed_data
        #tx = w3.eth.sendRawTransaction(signed_data)

    def sendRawTransaction(self,signed_data):
        tx = self.w3.eth.sendRawTransaction(signed_data)
        return tx.hex()

def adaCrossChain(node,contract_address,abi,groupID,tokenID,cc_amount,fee,tokenAddr,dstAddress,from_addr,pri,nonce,chainid):
    with open(abi) as f:
        contract_abi = json.load(f)
    value = 0
    ethsign = ETH_Sign(node, from_addr, chainid, pri)
    func = 'userBurn'
    args = [Web3.toBytes(hexstr=groupID), tokenID,cc_amount,fee, Web3.toChecksumAddress(tokenAddr.lower()),Web3.toBytes(text=dstAddress)]
    tx = ethsign.sendRawTransaction(ethsign.signEthContractTx(contract_address,contract_abi,func,args,value,nonce))
    print(tx)
    return tx

def wanADABurn(srcChain,count=1):
    if srcChain == 'ETH':
        node = 'http://52.34.91.48:36892'
        contract_address = '0x7b985c9379a13d2adf685aee9cb6d2e3f1809ffb'
        chainid = 4
        tokenAddr = '0xF451372043C88E5960be1CA6b1AC5e5181a1800B'
        tokenID = 19
    if srcChain == 'WAN':
        node = 'https://gwan-ssl.wandevs.org:46891'
        contract_address = '0x62De27E16F6F31D9aA5b02f4599fC6e21b339E79'
        chainid = 999
        tokenAddr = '0xa4e62375593662e8ff92fad0ba7fcad25051ebcb'
        tokenID = 110
    if srcChain == 'AVAX':
        node = 'https://api.avax-test.network/ext/bc/C/rpc'
        contract_address = '0x4c200A0867753454Db78AF84d147Bd03e567f234'
        chainid = 43113
        tokenAddr = '0x18266E440dDAaA5794E922E7125F453F28A6AFc0'
        tokenID = 46
    w3 = Web3(Web3.HTTPProvider(node))
    abi = r'abi.CrossDelegate.json'  # abi path
    # groupID = sys.argv[1] #'0x000000000000000000000000000000000000000000746573746e65745f303231' #
    groupID = '0x000000000000000000000000000000000000000000746573746e65745f303334' #'0x000000000000000000000000000000000000000000746573746e65745f303231' #
    cc_amount = 1000000
    fee = 0
    pri = '75e975b4659556869b039f1ea5bd7852ef1b11f3a30b5c35d36d0766aa4973c9'
    from_addr = '0xedbdf9e0c92528651dac75d2e9443140a8cb283c'

    nonce = w3.eth.getTransactionCount(Web3.toChecksumAddress(from_addr.lower()))
    adaAddress = 'addr_test1qpu9aa006vh80mstyt0hjpqfa0duhsnnvtga0k5c3pjxr5u8k86p04vf30ug5yfughrkmz7vvgsgcszpsc0ulml2vnts40kery'
    for i in range(0,count):
        # print('nonce is ',nonce)
        adaCrossChain(node,contract_address,abi,groupID,tokenID,cc_amount,fee,tokenAddr,adaAddress,from_addr,pri,nonce,chainid)
        nonce+=1
if __name__ == '__main__':
    # wanADABurn(sys.argv[3],count=int(sys.argv[2]))
    wanADABurn('WAN',count=50)
