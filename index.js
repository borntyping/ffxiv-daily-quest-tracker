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
    progressionAllied;

    constructor({tier, name, maxPoints, questPoints, progressionAllied}) {
        this.tier = tier;
        this.name = name;
        this.maxPoints = maxPoints;
        this.questPoints = questPoints;
        this.progressionAllied = progressionAllied || false;
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
            return null;
        }

        const ranksByTier = Object.fromEntries(this.ranks.map((r) => [r.tier, r]))

        return ranksByTier[this.reputation.tier];
    }

    progression() {
        if (this.reputation.tier == null) {
            return `Unlock ${this.name} daily quests to start. `
        }

        if (this.reputation.tier === this.ranks[this.ranks.length - 1].tier) {
            return `You are allied with the ${this.name}.`;
        }

        if (this.rank?.progressionAllied) {
            return `Complete <i>${this.expansion}</i> Allied tribal quests to continue.`
        }

        if (this.reputation.points === this.rank?.maxPoints) {
            return `<strong>Complete the next ${this.name} story quest to continue.</strong>`
        }


        return undefined;
    }

    remainingRanks() {
        return Object.values(this.ranks).filter((rank) => {
            return rank.tier >= this.reputation.tier;
        })
    }

    pointsPerQuest() {
        return this.rank?.questPoints;
    }

    pointsToNextRank() {
        return this.rank?.maxPoints - this.reputation.points;
    }

    questsToNextRank() {
        return this.rank?.maxPoints ? Math.ceil(this.pointsToNextRank() / this.pointsPerQuest()) : 0;
    }

    daysToNextRank() {
        return Math.ceil(this.questsToNextRank() / 3);
    }

    pointsToMaxRank() {
        return this.remainingRanks().reduce((x, y) => x + y.maxPoints, -this.reputation.points);
    }

    questsToMaxRank() {
        return this.rank?.maxPoints ? Math.ceil(this.pointsToMaxRank() / this.pointsPerQuest()) : 0;
    }

    daysToMaxRank() {
        return Math.ceil(this.questsToMaxRank() / 3);
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

    progressingTribes() {
        return this.tribes.filter((t) => t.pointsToNextRank() > 0);
    }

    maxQuestsPerDay() {
        return Math.min(this.progressingTribes().length * 3, 12);
    }

    unlockedTribes() {
        return this.tribes.filter((t) => t.reputation.tier);
    }

    pointsToNextRank() {
        return this.unlockedTribes().reduce((x, y) => x + y.pointsToNextRank(), 0);
    }

    questsToNextRank() {
        return this.unlockedTribes().reduce((x, y) => x + y.questsToNextRank(), 0);
    }

    daysToNextRank() {
        return Math.ceil(this.questsToNextRank() / this.maxQuestsPerDay());
    }

    pointsToMaxRank() {
        return this.unlockedTribes().reduce((x, y) => x + y.pointsToMaxRank(), 0);
    }

    questsToMaxRank() {
        return this.unlockedTribes().reduce((x, y) => x + y.questsToMaxRank(), 0);
    }

    daysToMaxRank() {
        return Math.ceil(this.questsToMaxRank() / this.maxQuestsPerDay());
    }
}

document.addEventListener('alpine:init', async () => {
    console.info('Running alpine:init hook');
    Alpine.store('expansions', []);

    console.debug('Fetching JSON data');
    const request = new Request('index.json');
    const response = await fetch(request);
    const data = await response.json();
    console.debug('Fetched JSON data');

    Alpine.store('expansions', data['expansions'].map((expansion) => {
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
    }));

    console.info('Completed alpine:init hook');
});
