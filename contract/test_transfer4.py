# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class TestTransfer4(gl.Contract):
    balances: TreeMap[str, u256]

    def __init__(self):
        pass

    @gl.public.write.payable
    def fund(self) -> None:
        caller = str(gl.message.sender_address).lower()
        val = u256(gl.message.value)
        curr = self.balances.get(caller, u256(0))
        self.balances[caller] = u256(int(curr) + int(val))

    @gl.public.write
    def withdraw(self) -> None:
        caller_addr = gl.message.sender_address
        caller_str = str(caller_addr).lower()
        amount = self.balances.get(caller_str, u256(0))
        if amount > u256(0):
            self.balances[caller_str] = u256(0)
            gl.get_contract_at(caller_addr).emit_transfer(value=amount, on="finalized")
