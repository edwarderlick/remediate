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
                
                from genlayer.py.types import Address
                
                sender = self.sender
                if sender is not None and not isinstance(sender, Address):
                    sender = Address(sender)
                    
                origin = self.origin
                if origin is not None and not isinstance(origin, Address):
                    origin = Address(origin)
                    
                msg_mod.sender_address = sender
                msg_mod.origin_address = origin
        except Exception:
            pass
'''

c = re.sub(r'    def _refresh_gl_message.*?except ImportError:\s*# genlayer not loaded yet, nothing to update\s*pass', new_refresh, c, flags=re.DOTALL)
with open(p, 'w') as f:
    f.write(c)
print("Done")
