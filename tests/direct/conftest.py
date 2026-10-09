import hashlib
import os
import sys
from pathlib import Path

import pytest
from gltest.direct.loader import deploy_contract


def _drop_host_genlayer_modules():
    # The runner stdlib must win over the off-chain SDK already in sys.modules.
    for name in list(sys.modules):
        if name == "genlayer" or name.startswith("genlayer."):
            del sys.modules[name]


@pytest.fixture(autouse=True)
def isolate_contract_sdk(monkeypatch):
    from gltest.direct.sdk_loader import setup_sdk_paths as original_setup

    def setup_and_drop(*args, **kwargs):
        paths = original_setup(*args, **kwargs)
        _drop_host_genlayer_modules()
        return paths

    monkeypatch.setattr("gltest.direct.sdk_loader.setup_sdk_paths", setup_and_drop)
    _drop_host_genlayer_modules()
    yield


@pytest.fixture(autouse=True)
def windows_fd0_tempfile_unlink(monkeypatch):
    if sys.platform != "win32":
        yield
        return

    real_unlink = os.unlink

    def unlink_ignore_locked(path):
        try:
            real_unlink(path)
        except PermissionError:
            pass

    monkeypatch.setattr(os, "unlink", unlink_ignore_locked)
    yield


@pytest.fixture
def direct_alice():
    return hashlib.sha256(b"alice").digest()[:20]


@pytest.fixture
def direct_bob():
    return hashlib.sha256(b"bob").digest()[:20]


@pytest.fixture
def direct_deploy(direct_vm):
    def deploy(contract_path, *args, **kwargs):
        return deploy_contract(
            Path(contract_path).resolve(),
            direct_vm,
            *args,
            sdk_version=os.environ.get("GENVM_VERSION", "v0.6.0-rc8"),
            **kwargs,
        )

    return deploy
