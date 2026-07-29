# Watcher AI, käyttöliittymä

Tämä on Watcher AI -sovelluksen käyttöliittymä eli frontend. Se tarjoaa selainkäyttöisen käyttöliittymän tekoälykeskusteluihin, keskusteluhistorian hallintaan sekä käyttäjätilin asetuksiin. Taustapalvelu eli backend on omassa repossaan.

## Mikä Watcher AI on

Watcher AI on tekoälyavustaja, jonka kanssa käyttäjä voi keskustella tekstillä tai puheella. Keskustelut tallennetaan käyttäjäkohtaisesti, niitä voidaan hakea myöhemmin ja tekoälyn vastaukset voidaan kuunnella puheena.

## Tekniikka

Käyttöliittymä on toteutettu seuraavilla tekniikoilla:

- **React** rakentaa käyttöliittymän
- **Vite** toimii kehitysympäristönä ja rakentaa tuotantoversion
- **JavaScript** toteuttaa sovelluksen toiminnallisuuden
- **CSS** toteuttaa käyttöliittymän ulkoasun
- **Fetch API** hoitaa yhteyden backendiin
- **OpenAI Whisper** mahdollistaa puheentunnistuksen backendin kautta
- **OpenAI Text-to-Speech (TTS)** mahdollistaa vastausten kuuntelemisen backendin kautta

## Kansiot ja tiedostot

- `src/main.jsx` käynnistää sovelluksen
- `src/App.jsx` sisältää sovelluksen päälogiikan
- `src/api.js` hoitaa yhteyden backendiin
- `src/index.css` sisältää sovelluksen yleiset tyylit

### components/

- `Login.jsx` kirjautuminen ja rekisteröinti
- `Chat.jsx` keskustelunäkymä
- `Sidebar.jsx` keskusteluhistorian hallinta
- `DeleteAccount.jsx` käyttäjätilin poistaminen
- `AdminPanel.jsx` ylläpitopaneeli

### assets/

Sisältää sovelluksen kuvakkeet ja muun kuvamateriaalin.

- `watcher.png`
- `icon.png`
- `icon.ico`
- `favicon.png`

Kaikki sovelluksen kuvat ovat omaa tuotantoa.

## Asennus

1. Asenna riippuvuudet

```
npm install
```

2. Luo projektin juureen `.env`-tiedosto.

3. Lisää siihen backendin osoite.

4. Käynnistä kehitysympäristö

```
npm run dev
```

5. Rakenna tuotantoversio

```
npm run build
```

Valmis julkaistava versio muodostuu `dist`-kansioon.

## Ympäristömuuttujat

Frontend käyttää `.env`-tiedostoa.

- `VITE_API_URL` backend-palvelimen osoite

Kehitysympäristössä arvo on esimerkiksi

```
http://localhost:5000
```

Tuotannossa muuttuja osoittaa julkaistuun backendiin.

Kun osoite muuttuu, sovellus tulee rakentaa uudelleen komennolla

```
npm run build
```

koska Vite lukee ympäristömuuttujat rakennusvaiheessa.

## Ominaisuudet

- käyttäjän rekisteröinti
- turvallinen kirjautuminen
- keskustelu tekoälyn kanssa
- keskustelujen automaattinen tallennus
- keskusteluhistorian selaaminen
- keskustelujen poistaminen
- puheen muuttaminen tekstiksi
- tekoälyn vastausten kuunteleminen puheena
- käyttäjätilin poistaminen
- ylläpitopaneeli

## Julkaisu verkkopalvelimelle

Kun sovellus rakennetaan komennolla

```
npm run build
```

syntyy `dist`-kansio. Sen sisältö julkaistaan verkkopalvelimelle.

Palvelimelle tarvitaan myös projektin `.htaccess`-tiedosto, joka ohjaa kaikki osoitteet React-sovellukselle. Ilman sitä esimerkiksi sivun päivittäminen tai suoran osoitteen avaaminen voi johtaa 404-virheeseen.