-- Server-side word filter for profiles.username, profiles.first_name, profiles.last_name.
-- Mirrors src/libs/moderator/textModerator.ts. Defense in depth: client also moderates.
-- Run via Supabase SQL editor or `supabase db push`.

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE IF NOT EXISTS profile_blocked_words (
    word text PRIMARY KEY
);

ALTER TABLE profile_blocked_words ENABLE ROW LEVEL SECURITY;

-- Normalize: lowercase, strip diacritics, map leet chars, strip non-alphanum.
CREATE OR REPLACE FUNCTION normalize_profile_text(t text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT regexp_replace(
        translate(
            lower(unaccent(coalesce(t, ''))),
            '013456789@$!+(',
            'oieasgtbgasitc'
        ),
        '[^a-z0-9]', '', 'g'
    );
$$;

CREATE OR REPLACE FUNCTION check_profile_words()
RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    combined text;
    bad text;
BEGIN
    combined := normalize_profile_text(NEW.username)
        || '|' || normalize_profile_text(NEW.first_name)
        || '|' || normalize_profile_text(NEW.last_name);

    SELECT word INTO bad
    FROM profile_blocked_words
    WHERE combined LIKE '%' || normalize_profile_text(word) || '%'
      AND length(normalize_profile_text(word)) > 0
    LIMIT 1;

    IF bad IS NOT NULL THEN
        RAISE EXCEPTION 'Profile contains disallowed content'
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_word_filter ON profiles;
CREATE TRIGGER profile_word_filter
BEFORE INSERT OR UPDATE OF username, first_name, last_name ON profiles
FOR EACH ROW EXECUTE FUNCTION check_profile_words();

-- Seed blocklist. Mirrors BLOCKLIST in textModerator.ts. ON CONFLICT handles duplicates.
INSERT INTO profile_blocked_words (word) VALUES
('2g1c'),('2 girls 1 cup'),('acrotomophilia'),('alabama hot pocket'),
('alaskan pipeline'),('anal'),('anilingus'),('anus'),('apeshit'),
('arsehole'),('ass'),('asshole'),('assmunch'),('auto erotic'),
('autoerotic'),('babeland'),('baby batter'),('baby juice'),('ball gag'),
('ball gravy'),('ball kicking'),('ball licking'),('ball sack'),
('ball sucking'),('bangbros'),('bareback'),('barely legal'),('barenaked'),
('bastard'),('bastardo'),('bastinado'),('bbw'),('bdsm'),('beaner'),
('beaners'),('beaver cleaver'),('beaver lips'),('bestiality'),
('big black'),('big breasts'),('big knockers'),('big tits'),('bimbos'),
('birdlock'),('bitch'),('bitches'),('black cock'),('blonde action'),
('blonde on blonde action'),('blowjob'),('blow job'),('blow your load'),
('blue waffle'),('blumpkin'),('bollocks'),('bondage'),('boner'),
('boob'),('boobs'),('booty call'),('brown showers'),('brunette action'),
('bukkake'),('bulldyke'),('bullet vibe'),('bullshit'),('bung hole'),
('bunghole'),('busty'),('camel toe'),('camgirl'),('camslut'),
('camwhore'),('carpet muncher'),('carpetmuncher'),('chocolate rosebuds'),
('circlejerk'),('cleveland steamer'),('clit'),('clitoris'),
('clover clamps'),('clusterfuck'),('cock'),('cocks'),('coprolagnia'),
('coprophilia'),('cornhole'),('coon'),('coons'),('creampie'),
('cum'),('cumming'),('cunnilingus'),('cunt'),('darkie'),('date rape'),
('daterape'),('deep throat'),('deepthroat'),('dendrophilia'),('dick'),
('dildo'),('dingleberry'),('dingleberries'),('dirty pillows'),
('dirty sanchez'),('doggie style'),('doggiestyle'),('doggy style'),
('doggystyle'),('dog style'),('dolcett'),('domination'),('dominatrix'),
('dommes'),('donkey punch'),('double dong'),('double penetration'),
('dp action'),('dry hump'),('dvda'),('eat my ass'),('ecchi'),
('ejaculation'),('erotic'),('erotism'),('escort'),('eunuch'),
('fag'),('faggot'),('fecal'),('felch'),('fellatio'),('feltch'),
('female squirting'),('femdom'),('figging'),('fingerbang'),('fingering'),
('fisting'),('foot fetish'),('footjob'),('frotting'),('fuck'),
('fuck buttons'),('fuckin'),('fucking'),('fucktards'),('fudge packer'),
('fudgepacker'),('futanari'),('gang bang'),('gay sex'),('genitals'),
('giant cock'),('girl on'),('girl on top'),('girls gone wild'),
('gokkun'),('golden shower'),('goodpoop'),('goo girl'),('goregasm'),
('grope'),('group sex'),('gspot'),('guro'),('hand job'),('handjob'),
('hentai'),('homoerotic'),('honkey'),('hooker'),('hot carl'),
('hot chick'),('how to kill'),('how to murder'),('huge fat'),
('humping'),('incest'),('intercourse'),('jack off'),('jail bait'),
('jailbait'),('jelly donut'),('jerk off'),('jew'),('jigaboo'),
('jiggaboo'),('jiggerboo'),('jizz'),('juggs'),('kike'),('kinbaku'),
('kinkster'),('kinky'),('knobbing'),('leather restraint'),
('leather straight jacket'),('lemon party'),('lolita'),('lovemaking'),
('make me come'),('male squirting'),('masturbate'),('masturbating'),
('menage a trois'),('milf'),('missionary position'),('motherfucker'),
('mound of venus'),('mr hands'),('muff diver'),('muffdiving'),
('nambla'),('nawashi'),('negro'),('neonazi'),('nig'),('nigga'),
('nigger'),('nig nog'),('nimphomania'),('nipple'),('nipples'),
('nude'),('nudity'),('nympho'),('nymphomania'),('octopussy'),
('omorashi'),('one cup two girls'),('one guy one jar'),('orgasm'),
('orgy'),('paedophile'),('paki'),('panties'),('panty'),('pedobear'),
('pedophile'),('pegging'),('penis'),('phone sex'),('piece of shit'),
('pissing'),('piss pig'),('pisspig'),('playboy'),('pleasure chest'),
('pole smoker'),('ponyplay'),('poof'),('poon'),('poontang'),
('punany'),('poop chute'),('poopchute'),('porn'),('porno'),
('pornography'),('prince albert piercing'),('pthc'),('pubes'),
('pussy'),('queaf'),('queef'),('quim'),('raghead'),('raging boner'),
('rape'),('raping'),('rapist'),('rectum'),('reverse cowgirl'),
('rimjob'),('rimming'),('rosy palm'),('rosy palm and her 5 sisters'),
('rusty trombone'),('sadism'),('santorum'),('scat'),('schlong'),
('scissoring'),('semen'),('sex'),('sexo'),('shaved beaver'),
('shaved pussy'),('shemale'),('shibari'),('shit'),('shitblimp'),
('shitty'),('shota'),('shrimping'),('skeet'),('slanteye'),('slut'),
('smut'),('snatch'),('snowballing'),('sodomize'),('sodomy'),
('spic'),('splooge'),('splooge moose'),('spooge'),('spread legs'),
('spunk'),('strap on'),('strapon'),('strappado'),('strip club'),
('style doggy'),('suck'),('sucks'),('suicide girls'),('sultry women'),
('swastika'),('swinger'),('tainted love'),('taste my'),('tea bagging'),
('threesome'),('throating'),('tied up'),('tight white'),('tit'),
('tits'),('titties'),('titty'),('tongue in a'),('topless'),
('tosser'),('towelhead'),('tranny'),('tribadism'),('tub girl'),
('tubgirl'),('tushy'),('twat'),('twink'),('twinkie'),
('two girls one cup'),('undressing'),('upskirt'),('urethra play'),
('urophilia'),('vagina'),('venus mound'),('vibrator'),('violet wand'),
('vorarephilia'),('voyeur'),('vulva'),('wank'),('wetback'),
('wet dream'),('white power'),('wrapping men'),('wrinkled starfish'),
('xx'),('xxx'),('yaoi'),('yellow showers'),('yiffy'),('zoophilia'),
('nazi'),('kill yourself'),('kys'),('dyke'),('chink'),('retard'),
('asesinato'),('asno'),('bollera'),('cabron'),('cabrón'),('caca'),
('chupada'),('chupapollas'),('chupeton'),('concha'),
('concha de tu madre'),('cono'),('coño'),('cofragia'),('culo'),
('drogas'),('esperma'),('fiesta de salchichas'),('follador'),
('follar'),('gilipichis'),('gilipollas'),('hacer una paja'),
('haciendo el amor'),('heroina'),('hija de puta'),('hijaputa'),
('hijo de puta'),('hijoputa'),('idiota'),('imbecil'),('infierno'),
('jilipollas'),('kapullo'),('lameculos'),('maciza'),('macizorra'),
('maldito'),('mamada'),('marica'),('maricon'),('maricón'),
('mariconazo'),('martillo'),('mierda'),('orina'),('pedo'),
('pervertido'),('pezon'),('pinche'),('pis'),('prostituta'),
('puta'),('racista'),('ramera'),('sadico'),('soplagaitas'),
('soplapollas'),('tetas grandes'),('tia buena'),('travesti'),
('trio'),('verga'),('vete a la mierda')
ON CONFLICT (word) DO NOTHING;
