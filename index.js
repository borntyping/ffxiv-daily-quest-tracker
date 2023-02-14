class Utils {
    static sum(array) {
        return array.reduce((x, y) => x + y, 0)
    }

    static daysToComplete(tribes) {
        let daysPerTribe = tribes.map((t) => t.daysToMaxRank());

        console.log(daysPerTribe);

        // If we have more than 4 tribes to complete, merge the two tribes with the fewest days to completion.
        // This only gets used for A Realm Reborn which has 5 tribes.
        while (daysPerTribe.length > 4) {
            daysPerTribe.sort((a, b) => a - b); // inplace
            daysPerTribe = [daysPerTribe[0] + daysPerTribe[1], ...daysPerTribe.slice(2)]
        }

        return Math.max(...daysPerTribe);
    }
}

class Reputation {
    expansion;
    tribe;

    constructor({expansion, tribe}) {
        this.expansion = expansion;
        this.tribe = tribe;
    }

    getState() {
        const item = window.localStorage.getItem('reputation');
        return item !== null ? JSON.parse(item) : {};
    }

    setState(state) {
        window.localStorage.setItem('reputation', JSON.stringify(state))
    }

    get tier() {
        const state = this.getState();
        return state[this.expansion]?.[this.tribe]?.tier || null;
    }

    set tier(value) {
        const state = this.getState();

        state[this.expansion] ??= {};
        state[this.expansion][this.tribe] ??= {};
        state[this.expansion][this.tribe].tier = value;

        this.setState(state);
        return value;
    }

    get points() {
        const state = this.getState();
        return state[this.expansion]?.[this.tribe]?.points || 0;
    }

    set points(value) {
        const state = this.getState();

        state[this.expansion] ??= {};
        state[this.expansion][this.tribe] ??= {};
        state[this.expansion][this.tribe].points = value;

        this.setState(state);
        return value;
    }
}

class Rank {
    tier;
    name;
    maxPoints;
    questPoints;
    progressionUnlock;
    progressionAllied;

    constructor({tier, name, maxPoints, questPoints, progressionUnlock, progressionAllied}) {
        this.tier = tier;
        this.name = name;
        this.maxPoints = maxPoints;
        this.questPoints = questPoints;
        this.progressionUnlock = progressionUnlock || false;
        this.progressionAllied = progressionAllied || false;
    }

    pointsNeeded(characterPoints = 0) {
        return this.maxPoints - characterPoints;
    }

    questsNeeded(characterPoints = 0) {
        if (this.maxPoints === 0) {
            return 0;
        }

        return Math.ceil(this.pointsNeeded(characterPoints) / this.questPoints);
    }

    daysNeeded(characterPoints = 0) {
        return Math.ceil(this.questsNeeded(characterPoints) / 3)
    }
}

class Tribe {
    constructor({name, expansion, ranks, reputation}) {
        this.name = name;
        this.expansion = expansion;
        this.ranks = ranks;
        this.reputation = reputation;
    }

    icon() {
        return `img/tribes/${this.name}.png`;
    }

    /**
     * The current reputation rank the player has achieved.
     * @returns Rank
     */
    get rank() {
        if (this.reputation.tier === null) {
            return new Rank({
                tier: 0,
                name: "None",
                maxPoints: 0,
                questPoints: 0,
                progressionUnlock: true,
                progressionAllied: false,
            });
        }

        const ranksByTier = Object.fromEntries(this.ranks.map((r) => [r.tier, r]))
        return ranksByTier[this.reputation.tier];
    }

    get lastRank() {
        return this.ranks[this.ranks.length - 1]
    }

    get futureRanks() {
        return Object.values(this.ranks).filter((rank) => {
            return rank.tier > this.reputation.tier;
        })
    }

    progression() {
        if (this.rank.progressionUnlock) {
            return `Unlock <span>${this.name}</span> daily quests to start.`
        }

        if (this.lastRank.tier === this.reputation.tier) {
            return `You are allied with the <span>${this.name}</span>.`;
        }

        if (this.rank.progressionAllied) {
            return `Complete <i>${this.expansion}</i> Allied tribal quests to continue.`
        }

        if (this.rank.pointsNeeded(this.reputation.points) === 0) {
            return `<strong>Complete the next ${this.name} story quest to continue.</strong>`
        }

        return undefined;
    }

    pointsToNextRank() {
        return this.rank.pointsNeeded(this.reputation.points);
    }

    questsToNextRank() {
        return this.rank.questsNeeded(this.reputation.points);
    }

    daysToNextRank() {
        return this.rank.daysNeeded(this.reputation.points);
    }

    pointsToMaxRank() {
        return this.pointsToNextRank() + Utils.sum(this.futureRanks.map((r) => r.pointsNeeded(0)))
    }

    questsToMaxRank() {
        return this.questsToNextRank() + Utils.sum(this.futureRanks.map((r) => r.questsNeeded(0)))
    }

    daysToMaxRank() {
        return this.daysToNextRank() + Utils.sum(this.futureRanks.map((r) => r.daysNeeded(0)))
    }
}

class Expansion {
    tribes;

    constructor({name, tribes}) {
        this.name = name;
        this.tribes = tribes;
    }

    started() {
        return this.unlockedTribes().length > 0;
    }

    /**
     * Tribes
     * @return Array<Tribe>
     */
    unlockedTribes() {
        return this.tribes.filter((t) => t.reputation.tier > 0);
    }

    /**
     * @return Array<Tribe>
     */
    tribesWithPointsRemaining() {
        return this.tribes.filter((t) => t.pointsToMaxRank() > 0);
    }

    pointsToCompletion() {
        return Utils.sum(this.tribes.map((t) => t.pointsToMaxRank()));
    }

    questsToCompletion() {
        return Utils.sum(this.tribes.map((t) => t.questsToMaxRank()));
    }

    daysToCompletion() {
        return Utils.daysToComplete(this.tribes);
    }
}

class Game {
    expansions;

    constructor({expansions}) {
        this.expansions = expansions;
    }

    get tribes() {
        return this.expansions.reduce((array, expansion) => array.concat(expansion.tribes), []);
    }

    get tribesWithPointsRemaining() {
        return this.expansions.reduce((array, expansion) => array.concat(expansion.tribesWithPointsRemaining()), []);
    }

    pointsToCompletion() {
        return Utils.sum(this.expansions.map((t) => t.pointsToCompletion()));
    }

    questsToCompletion() {
        return Utils.sum(this.expansions.map((t) => t.questsToCompletion()));

    }

    daysToCompletion() {
        // return Utils.sum(this.expansions.map((t) => t.daysToCompletion()));
        return Utils.daysToComplete(this.tribes);
    }
}

document.addEventListener('alpine:init', async () => {
    console.info('Running alpine:init hook');
    Alpine.store('game', new Game({ expansions: [] }));

    console.debug('Fetching JSON data');
    const request = new Request('index.json');
    const response = await fetch(request);
    const data = await response.json();
    console.debug('Fetched JSON data');

    Alpine.store('game', new Game({
        expansions: data['expansions'].map((expansion) => {
            console.debug(`Creating Expansion for ${expansion.name}`)
            return new Expansion({
                name: expansion.name,
                tribes: expansion.tribes.map((tribe) => {
                    console.debug(`Creating Tribe for ${expansion.name} → ${tribe.name}`)
                    return new Tribe({
                        name: tribe.name,
                        expansion: expansion.name,
                        ranks: tribe['ranks'].map((rank) => {
                            return new Rank(rank);
                        }),
                        reputation: new Reputation({expansion: expansion.name, tribe: tribe.name}),
                    });
                })
            })
        })
    }));

    console.info('Completed alpine:init hook');
});
