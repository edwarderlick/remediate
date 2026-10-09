with open('tests/direct/test_remediate.py', 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r'direct_vm\.set_msg_id.*?\n', '', content)

with open('tests/direct/test_remediate.py', 'w', encoding='utf-8') as f:
    f.write(content)
