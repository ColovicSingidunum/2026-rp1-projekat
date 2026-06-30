# Self-Storage CMS

## Kratak Opis

Projekat 3 (Napredni Docker) iz predmeta Računarski praktikum 1.

CMS za upravljanje self-storage objektom.

Opis arhitekture se može naći u folderu `dokumentacija`.

## Pokretanje kontejnera

Pokretanje kroz doker compose:

```bash
docker compose up --build -d
```

Nakon uspešnog build-a otvoriti [https://localhost/](https://localhost/)

> TLS sertifikat je self-signed, zato browser prikazuje upozorenje.
> Prihvati ga ručno ili instalirati [TLS sertifikat](#tls-sertifikat) kao pouzdan

## Konfiguracija (.env)

Kredencijali baze se postavljaju preko `.env` fajla u root folderu prokekta (primer env fajla se može naći u `.env.example`).

Ako `.env` ne postoji, koriste se podrazumevane vrednosti iz `docker-compose.yml`.

```env
POSTGRES_USER=storage
POSTGRES_PASSWORD=storage_pass
POSTGRES_DB=selfstorage
```

Backend čita konekciju iz `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`
(ove vrednosti postavlja `docker-compose.yml`, ne diraju se ručno).

## TLS sertifikat

Proxy servis generiše self-signed **TLS** (Transport Layer Security) sertifikat pri build-u (`proxy/Dockerfile`),
sa `CN=localhost` (Common Name) i SAN-om `DNS:localhost, IP:127.0.0.1` (Subject Alternative Name).

HTTP zahtevi (port 80) se trajno preusmeravaju na HTTPS (port 443).

Da bi browser prestao da prikazuje upozorenje, TLS sertifikat generisan prilikom build procesa se mora instalirati kao pouzdan sertifikat na operativni sistem.

### 1. Izvlačenje Sertifikata iz pokrenutog proxy kontejnera

- Windows:
    ```powershell
    docker cp projekat-praktikum-1-proxy-1:/etc/nginx/certs/selfsigned.crt "$env:USERPROFILE\Desktop\selfsigned.crt"
    ```
- Linux:
    ```bash
    docker cp projekat-praktikum-1-proxy-1:/etc/nginx/certs/selfsigned.crt ~/selfsigned.crt
    ```

### 2. Instaliranje Sertifikata

- Windows (PowerShell - Admin)
    ```powershell
    Import-Certificate -FilePath "$env:USERPROFILE\Desktop\selfsigned.crt" -CertStoreLocation Cert:\LocalMachine\Root
    ```
- Linux (Bash)
    ```bash
    sudo cp ~/selfsigned.crt /etc/pki/ca-trust/source/anchors/selfstorage.crt
    sudo update-ca-trust
    ```

Nakon ovoga je potreban restart browser-a.

## Zaustavljanje kontejnera

- Bez brisanja Volume-a:
    ```bash
    docker compose down
    ```
- Sa brisanjem Volume-a:
    ```bash
    docker compose down -v
    ```

## Licenca

[GNU GPL v3.0](LICENSE)
