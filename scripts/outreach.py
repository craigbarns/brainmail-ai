#!/usr/bin/env python3
# Prospection B2B BRAINMAIL — envoi du lot quotidien (10/jour max).
# CNIL B2B : adresses professionnelles publiées, offre liée au métier,
# identification claire, opt-out simple. Jamais de relance automatique.
import csv, glob, json, os, re, smtplib, ssl, subprocess, sys
from datetime import datetime
from email.message import EmailMessage

ROOT = os.path.expanduser('~/brainmail-ai/prospection')
STATE = os.path.join(ROOT, 'outreach-state.json')
LOG = os.path.join(ROOT, 'outreach-envois.csv')
SMTP_HOST, SMTP_PORT = 'smtp.ionos.fr', 587
FROM = os.environ.get('OUTREACH_FROM', 'gregory@brainmail.ai')
PASSWORD = os.environ.get('OUTREACH_PASSWORD') or subprocess.run(
    ['security', 'find-generic-password', '-w', '-s', 'brainmail-ionos-mail'],
    capture_output=True, text=True).stdout.strip()
DAILY_CAP = int(os.environ.get('OUTREACH_CAP', '10'))
BATCH = int(sys.argv[1]) if len(sys.argv) > 1 else DAILY_CAP

def load_state():
    if os.path.exists(STATE):
        with open(STATE, encoding='utf-8') as h: return json.load(h)
    return {'sent': {}, 'stopped': []}

def queue(state):
    seen, rows = set(), []
    for f in sorted(glob.glob(os.path.join(ROOT, 'lot-*resultat.csv'))):
        with open(f, encoding='utf-8', errors='ignore') as h:
            for r in csv.reader(h, delimiter=';'):
                if len(r) < 10 or not re.match(r'^\d{9}$', r[0] or ''): continue
                siren = r[0]
                if siren in state['sent'] or siren in state['stopped'] or siren in seen: continue
                seen.add(siren)
                mails = re.findall(r'[\w.+-]+@[\w-]+\.\w+', r[7] or '')
                perso = [m for m in mails if not m.lower().startswith(('contact','info','secretariat','accueil','admin','bonjour'))]
                mail = (perso or mails)[0] if mails else None
                if not mail: continue
                verifie = 'SITE_VERIFIE' in ' '.join(r)
                nom, dirig, adresse = r[1], r[2], r[3]
                cp = r[4] if len(r) > 4 else ''
                ville = r[5] if len(r) > 5 else ''
                # colonnes variables selon lots : site en 6, email en 7
                prenom = (dirig.split(' ')[0] if dirig else '').title() or 'Madame, Monsieur'
                free = bool(re.match(r'^[^@]+@(gmail|hotmail|outlook|orange|yahoo|free|laposte|wanadoo)\.', mail, re.I))
                # MX check : une adresse sans MX valide brûle un envoi.
                try:
                    mx = subprocess.run(['dig', '+short', 'MX', mail.split('@')[1]], capture_output=True, text=True, timeout=10).stdout.strip()
                except Exception:
                    mx = ''
                score = (2 if verifie else 0) + (3 if perso else 0) - (2 if free else 0) - (3 if not mx else 0)
                if mx and score < 2: continue
                rows.append({'score': score, 'siren': siren, 'nom': nom, 'dirigeant': dirig,
                             'prenom': prenom, 'ville': ville or cp, 'mail': mail, 'verifie': verifie})
    rows.sort(key=lambda x: -x['score'])
    return rows

def render(p):
    salut = f"Bonjour {p['prenom']}," if p['prenom'] not in ('Madame, Monsieur',) else 'Bonjour,'
    site = ''
    perso_line = (f"à {p['ville']}," if p['ville'] else '')
    return f"""{salut}

Vous savez mieux que personne ce que représente le courrier administratif dans un cabinet : l'avis URSSAF posé « pour plus tard » chez un client, l'assurance relue trop tard, la date de télédéclaration découverte après la date limite.

BRAINMAIL fait de votre cabinet la centrale administrative de vos clients : chaque société dispose d'un espace où son courrier — scanné ou reçu par email — est lu, classé, et transformé en échéances sourcées. Chaque date est citée dans le document qui la prouve, chaque réponse est préparée en brouillon, et rien ne part sans validation. Vous gardez la vue sur l'ensemble{(' ' + perso_line) if perso_line else ''}.

En ce moment : 3 mois offerts (code PILOTE au paiement), sans engagement. Une démo de 15 minutes suffit pour savoir si ça s'insère dans votre organisation.

Si ce message ne vous intéresse pas, répondez simplement « stop » et je ne vous recontacte pas.

Gregory Baranes — fondateur
BRAINMAIL.ai · WeMade SASU, Marseille
https://www.brainmail.ai
"""

def main():
    state = load_state()
    today = datetime.now().strftime('%Y-%m-%d')
    sent_today = sum(1 for v in state['sent'].values() if v.get('date') == today)
    room = max(0, min(BATCH, DAILY_CAP - sent_today))
    if room == 0:
        print(f"Plafond du jour atteint ({sent_today}/{DAILY_CAP}). Rien n'est envoyé.")
        return
    rows = [p for p in queue(state) if p['siren'] not in state.get('failed', {})
            and not any(p['mail'].lower() == s for s in state.get('mails_envoyes', []))]
    todo = rows[:room]
    if not todo:
        print('File vide.'); return
    ctx = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=40) as s:
        s.starttls(context=ctx); s.login(FROM, PASSWORD)
        for p in todo:
            msg = EmailMessage()
            msg['From'] = f"Gregory Baranes — BRAINMAIL <{FROM}>"
            msg['To'] = p['mail']
            msg['Subject'] = "Le courrier de vos clients, sous contrôle — 3 mois offerts"
            msg['Reply-To'] = FROM
            msg.set_content(render(p))
            try:
                s.send_message(msg)
                state['sent'][p['siren']] = {'date': today, 'email': p['mail'], 'nom': p['nom']}
                state.setdefault('mails_envoyes', []).append(p['mail'].lower())
                print(f"OK {p['mail']} — {p['nom'][:40]} ({p['siren']})")
            except Exception as e:
                state.setdefault('failed', {})[p['siren']] = str(e)[:120]
                print(f"ECHEC {p['mail']} : {e}")
    with open(STATE, 'w', encoding='utf-8') as h: json.dump(state, h, ensure_ascii=False, indent=1)
    newfile = not os.path.exists(LOG)
    with open(LOG, 'a', encoding='utf-8', newline='') as h:
        w = csv.writer(h, delimiter=';')
        if newfile: w.writerow(['date','siren','nom','email','sujet'])
        for p in todo:
            if str(p['siren']) in state['sent']:
                w.writerow([today, p['siren'], p['nom'], p['mail'], 'lot1'])

if __name__ == '__main__':
    main()
