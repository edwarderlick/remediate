import os
with open("contract/remediate.py", "r") as f:
    code = f.read()
code = code.replace("str(gl.message_raw.get(\"datetime\", \"\"))", "str(get_now_unix())")
with open("contract/remediate.py", "w") as f:
    f.write(code)
print("Done")
