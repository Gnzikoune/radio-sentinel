import os
import datetime
import socket
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import ipaddress

def generate_self_signed_cert(cert_file="cert.pem", key_file="key.pem"):
    """Génère un certificat SSL local auto-signé pour autoriser le GPS sous Android."""
    if os.path.exists(cert_file) and os.path.exists(key_file):
        print(f"Certificats déjà présents ({cert_file}, {key_file}).")
        return

    print("Génération de la clé privée RSA...")
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    # Récupérer l'IP locale de la machine
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
    except Exception:
        local_ip = "127.0.0.1"
    finally:
        s.close()

    print(f"IP locale détectée pour le certificat : {local_ip}")

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "GA"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Radio Sentinel"),
        x509.NameAttribute(NameOID.COMMON_NAME, local_ip),
    ])

    alt_names = [
        x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
        x509.DNSName("localhost")
    ]
    if local_ip != "127.0.0.1":
        alt_names.append(x509.IPAddress(ipaddress.IPv4Address(local_ip)))

    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.utcnow() - datetime.timedelta(days=1)
    ).not_valid_after(
        datetime.datetime.utcnow() + datetime.timedelta(days=365)
    ).add_extension(
        x509.SubjectAlternativeName(alt_names),
        critical=False,
    ).sign(key, hashes.SHA256())

    with open(key_file, "wb") as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        ))

    with open(cert_file, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    print(f"Certificat généré avec succès : {cert_file} et {key_file}")

if __name__ == "__main__":
    generate_self_signed_cert()
