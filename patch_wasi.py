import os
import re

p = r'C:\Users\samir\AppData\Local\Programs\Python\Python312\Lib\site-packages\gltest\direct\wasi_mock.py'
with open(p, 'r') as f:
    c = f.read()

new_handle = '''def _handle_run_nondet(vm: "VMContext", data: Any) -> Any:
    import cloudpickle
    from genlayer.py import calldata

    data_leader = data.get("data_leader")
    if not data_leader:
        raise ValueError("RunNondet missing data_leader")

    leader_fn = cloudpickle.loads(data_leader)
    
    print("LEADER FN IS:", leader_fn)
    import inspect
    print("SIG IS:", inspect.signature(leader_fn))

    try:
        try:
            result = leader_fn(None)
        except TypeError:
            result = leader_fn()
            
        # Wrap result in Return format (code 0 + calldata)
        encoded = bytes([0]) + calldata.encode(result)
        return encoded
    except Exception as e:
        print("LEADER FN EXCEPTION:", e)
        # Wrap error in UserError format (code 1 + message)
        error_msg = str(e)
        return bytes([1]) + error_msg.encode('utf-8')
'''

c = re.sub(r'def _handle_run_nondet\(.*?\n        return bytes\[1\] \+ error_msg\.encode\(\'utf-8\'\)', new_handle, c, flags=re.DOTALL)
with open(p, 'w') as f:
    f.write(c)
print("Done")
