import os
import re

p = r'C:\Users\samir\AppData\Local\Programs\Python\Python312\Lib\site-packages\gltest\direct\vm.py'
with open(p, 'r') as f:
    c = f.read()

new_refresh = '''    def _refresh_gl_message(self) -> None:
        try:
            import sys
            if "genlayer.message" in sys.modules:
                msg_mod = sys.modules["genlayer.message"]
                from genlayer.types import Address
                
                sender = self.sender
                if sender is not None and not isinstance(sender, Address):
                    if hasattr(sender, "hex"):
                        sender = Address("0x" + sender.hex())
                    else:
                        sender = Address(sender)
                    
                origin = self.origin
                if origin is not None and not isinstance(origin, Address):
                    if hasattr(origin, "hex"):
                        origin = Address("0x" + origin.hex())
                    else:
                        origin = Address(origin)
                    
                msg_mod.sender_address = sender
                msg_mod.origin_address = origin
        except Exception as e:
            pass
'''

c = re.sub(r'    def _refresh_gl_message.*?except Exception.*?:.*?print\("REFRESH ERROR:".*?\)', new_refresh, c, flags=re.DOTALL)
with open(p, 'w') as f:
    f.write(c)
print("Done")
