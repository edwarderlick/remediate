# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

class TestTransfer2(gl.Contract):
    @gl.public.write
    def withdraw(self) -> None:
        gl.transfer(gl.message.sender_address, u256(1))
