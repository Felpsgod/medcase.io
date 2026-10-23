# MedCase App (React Native + Expo)

App de gestão de medicamentos pessoais: migração do `login.html` + `painel.html` para iOS e Android.

- **Expo SDK 58** · React Native 0.88 · React 19.3 · JavaScript puro
- **Backend:** API própria em Flask + SQLite, na pasta [`../backend`](../backend/README.md) (substituiu o Firebase)
- **Navegação:** React Navigation 7 (Drawer + Native Stack)
- **Push:** OneSignal (`react-native-onesignal` + `onesignal-expo-plugin`), App ID `06ccb5ea-16e0-4c72-9612-5460f097be42`

---

## 1. Instalação

Pré-requisitos: Node 20+; Android Studio (SDK + emulador) para Android; macOS + Xcode 16+ para iOS local.

```bash
cd MedCaseApp
npm install
npx expo-doctor        # deve mostrar "20/20 checks passed"
```

Para adicionar outras bibliotecas, use sempre `npx expo install <pacote>`: ele escolhe a versão compatível com o SDK.

### Backend

Suba a API antes de abrir o app (detalhes em [`../backend/README.md`](../backend/README.md)):

```bash
cd ../backend
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
python init.py            # http://0.0.0.0:5000
```

O app descobre o endereço sozinho ([src/config.js](src/config.js)). Em desenvolvimento, usa o IP do computador que roda o Metro (`<IP>:5000`), então o celular precisa estar no **mesmo Wi-Fi**. Sem o Metro, o emulador Android usa `10.0.2.2` e o simulador iOS usa `localhost`. Em produção, preencha `expo.extra.apiUrl` no `app.json` (ex.: `"https://api.medcase.com.br"`).

> ⚠️ **O Expo Go não funciona para o app completo.** OneSignal e outros módulos nativos exigem um **development build** (`npx expo run:*` ou EAS). No Expo Go o app abre, mas sem push: o serviço detecta o ambiente e desativa o OneSignal.

---

## 2. Rodar no Android

```bash
npx expo run:android
```

Esse comando gera a pasta `android/` (Continuous Native Generation), compila e instala o app no emulador ou no aparelho conectado via USB. Depois disso, para só subir o Metro:

```bash
npx expo start --dev-client
```

Não edite `android/` ou `ios/` à mão. Toda configuração nativa fica em `app.json` (plugins) e é regenerada com `npx expo prebuild --clean`.

## 3. Rodar no iOS

**Com Mac (local):**

```bash
npx expo run:ios                 # simulador
npx expo run:ios --device        # iPhone conectado
```

**Sem Mac (nuvem, EAS Build):**

```bash
npm i -g eas-cli          # ou use: npx eas-cli@latest <comando>
eas login
eas build:configure
eas build --profile development --platform ios    # build de desenvolvimento
eas build --profile production  --platform ios    # build para TestFlight/App Store
eas submit --platform ios
```

Push no iOS só funciona em **aparelho físico** (o simulador não recebe push remoto do APNs).

---

## 4. Configurar o OneSignal

O JS já está pronto ([src/services/notifications.js](src/services/notifications.js)): `OneSignal.initialize(APP_ID)` roda ao abrir o app, o login faz `OneSignal.login(<id do usuário>)` (e o logout faz `OneSignal.logout()`), e o botão **Configurações → Ativar Push Notifications** chama `OneSignal.Notifications.requestPermission(true)`.

A parte nativa é feita pelo **config plugin**, já declarado no `app.json`:

```json
["onesignal-expo-plugin", { "mode": "development" }]
```

O plugin, ao rodar `prebuild`/`run`:
- **iOS:** adiciona a capability *Push Notifications*, o *Background Mode → Remote notifications* (também declarado em `ios.infoPlist.UIBackgroundModes`), o entitlement `aps-environment` e a *Notification Service Extension* (`OneSignalNotificationServiceExtension`) para imagens/badges.
- **Android:** configura o SDK do OneSignal e a permissão `POST_NOTIFICATIONS` (Android 13+), que também está em `android.permissions`.

### Passos no painel do OneSignal (dashboard.onesignal.com)

1. **Android (FCM):** crie um projeto no Firebase Console com o pacote `com.medcase.app`, gere a chave da *Service Account* (Configurações → Contas de serviço → Gerar nova chave privada) e envie o JSON em *OneSignal → Settings → Push & In-App → Google Android (FCM)*.
2. **iOS (APNs):** no Apple Developer, crie uma chave **.p8** (Keys → Apple Push Notifications service) e envie-a em *OneSignal → Settings → Apple iOS (APNs)* com Key ID, Team ID e bundle `com.medcase.app`.
3. **Produção:** troque `"mode": "development"` por `"mode": "production"` no `app.json` antes do build da loja.
4. **EAS + iOS:** na primeira build, aceite que o EAS gerencie as credenciais. O target da extensão (`com.medcase.app.OneSignalNotificationServiceExtension`) precisa de provisioning profile próprio, e o EAS cria esse perfil automaticamente.

### Envio de push

Quem envia o push agora é o **backend**, não o app. Defina `ONESIGNAL_REST_API_KEY` (OneSignal → Settings → Keys & IDs) no ambiente do servidor antes de rodar `python init.py`. O push vai só para o usuário dono da dose (`external_id`), e não mais para o segmento "All". Também respeita a preferência "Notificações Push". A REST API Key não fica mais dentro do app.

---

## 5. Estrutura

```
MedCaseApp/
├── App.js                    # fontes, splash, providers, NavigationContainer, OneSignal.init
├── app.json                  # bundleIdentifier/package com.medcase.app, plugins, permissões
└── src/
    ├── theme/                # colors (:root), fonts, gradients (bg-c1..c8, timeline), shadows (Platform.select)
    ├── config.js             # API_URL (endereço do backend)
    ├── contexts/             # AuthContext (token), DataContext (polling 3s), UIContext (sidebar/modais)
    ├── services/             # api (cliente HTTP + rotas), auth, notifications (OneSignal), esp32
    ├── utils/                # dateHelpers, doseHelpers
    ├── navigation/           # AppNavigator (Root Stack + Drawer + Stack de Dispositivos)
    ├── components/           # Sidebar, Topbar, Dropdown, Modal, Toast, SlotCard, WatchCard,
    │                         # ContactCard, TimelineItem, Calendar, LedPanel, FarmaCard, LogEntry,
    │                         # Form (inputs/select/time/date/botões), Screen, Card, Avatar, Icon, HoraAMPM, NotifItem
    ├── screens/
    │   ├── auth/             # LoginScreen (+ recuperação de senha), RegisterScreen
    │   └── Dashboard, Devices, Maleta, Tags, Contacts, Notifications, Settings, ESP32, Farma, Profile
    └── modals/               # SlotModal, SintomasModal, ContatoModal, PerfilModal, PreferenciasModal, FarmaModal, GlobalModals
```

## 6. Funcionalidades migradas

| HTML | App |
|---|---|
| Login / Cadastro / Esqueci a senha (senha temporária + `reset_whatsapp`) | `LoginScreen`, `RegisterScreen`, `services/auth.js` |
| Dashboard: adesão mensal/diária, resumo de saúde, calendário semanal, timeline | `DashboardScreen` |
| Maleta (6 nichos), Tags ilimitadas, posologia fixa/manual, uso contínuo, data limite | `MaletaScreen`, `TagsScreen`, `SlotModal` |
| Registrar tomada (hora real + sintomas) | `SintomasModal` |
| Próxima dose (painel LED) | `LedPanel` + `buscarMaisProximo` |
| Contatos CRUD | `ContactsScreen`, `ContatoModal` |
| Notificações internas + push OneSignal | `NotifItem`, `NotificationsScreen`, `services/notifications.js` |
| Perfil (foto, tipo sanguíneo, alergias, emergência) | `PerfilModal`, `ProfileScreen` |
| Configurações (push + reiniciar histórico) | `SettingsScreen` |
| ESP32 (vincular, listar, logs com filtro e polling de 5s, desvincular) | `ESP32Screen`, `services/esp32.js` |
| Farmacêuticos (mock, filtros, agendamento) | `FarmaScreen`, `FarmaModal` |
| `setInterval(carregarDados, 3000)` | `DataContext` (pausa com o app em segundo plano) |

## 7. Diferenças em relação ao HTML (e por quê)

- **Backend próprio (Flask + SQLite)** no lugar do Firebase. Login com token, senhas com hash, e cada usuário só acessa os próprios dados. O formato de `GET /api/dados` imita o JSON do Firebase, então a lógica de doses do app não mudou. Os dados que já estavam no Firebase **não são migrados** automaticamente, e o `painel.html` precisa ser apontado para as novas rotas. O firmware do ESP32 (`../ESP32/main.cpp`) já usa o backend. O WhatsApp (recuperação de senha e aviso aos contatos a cada dose) é enviado pelo backend através da API da pasta `../whatsapp`.
- **Data das doses no fuso local.** O HTML usava `toISOString()` (UTC), e no Brasil, depois das 21h, a dose caía no dia seguinte. O formato da chave (`YYYY-MM-DD_HH:MM`) é o mesmo.
- **`<select>`** virou lista expansível (`SelectField`). **`<input type=time/date>`** virou o `DateTimePicker` nativo. **`prompt()`** da recuperação de senha virou um modal (o `Alert.prompt` só existe no iOS).
- **Filtro de logs** virou chips horizontais. Os logs mais recentes ficam no topo, sem auto-scroll para o fim.
- **Gradientes `bg-c4…c8`** não existiam no CSS (as variáveis não estavam definidas). Foram criados com a mesma paleta.
- **`filter: grayscale()`** (tratamento finalizado / dose tomada) não tem equivalente universal no RN. Usamos opacidade + overlay cinza.
- **Preferências** e **foto de perfil** são salvas no servidor. No HTML, as preferências eram descartadas e a foto ficava só no navegador.
- **Farmacêuticos** vêm da tabela `farmaceuticos`, e os pedidos de consulta ficam registrados em `agendamentos`. Antes era só um toast.
- **ESP32:** um dispositivo já vinculado a outra conta não pode ser "roubado" (erro 409). Desvincular remove o vínculo de fato. Sem sinal por 5 minutos, o dispositivo aparece como offline.
- **Tela "Meu Perfil"** é nova: reúne as ações do dropdown do avatar.
- **Pull-to-refresh** nas telas, além do polling.

## 8. Antes de publicar

- Hospede o backend com **HTTPS** e coloque a URL em `expo.extra.apiUrl`. O `app.json` libera HTTP (`usesCleartextTraffic` no Android, `NSAllowsLocalNetworking` no iOS) só para o desenvolvimento na rede local; desligue isso em produção.
- Troque a `ROBO_API_KEY` do servidor.
- As rotas do firmware (`/api/dispositivo/...`) confiam só no ID do ESP32, como era no Firebase. Se o ID for fácil de adivinhar, vale adicionar uma chave por dispositivo.
