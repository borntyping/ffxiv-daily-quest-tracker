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
    constructor({name, expansion, reputationStore, reputationRanks}) {
        this.name = name;
        this.expansion = expansion;
        this.reputationStore = reputationStore;
        this.reputationRanks = reputationRanks;
    }

    icon() {
        return `img/tribes/${this.name}.png`;
    }

    get currentTier() {
        this.reputationStore[this.name] ||= {};
        return (this.reputationStore[this.name].tier || 0);
    }

    set currentTier(value) {
        this.reputationStore[this.name].tier = value
    }

    get currentPoints() {
        this.reputationStore[this.name] ||= {};
        return (this.reputationStore[this.name].points || 0);
    }

    set currentPoints(value) {
        this.reputationStore[this.name].points = value
    }

    /**
     * The current reputation rank the player has achieved.
     * @returns Rank
     */
    get currentReputationRank() {
        return this.reputationRanks[this.currentTier];
    }

    progression() {
        if (this.currentTier === 0) {
            return `Unlock ${this.name} daily quests to start. `
        }

        if (this.currentReputationRank.progressionAllied) {
            return `Complete <i>${this.expansion}</i> Allied tribal quests to continue.`
        }

        if (this.currentReputationRank.maxPoints === this.currentPoints) {
            return `<strong>Complete the next ${this.name} story quest to continue.</strong>`
        }

        return undefined;
    }

    pointsPerQuest() {
        return this.currentReputationRank.questPoints;
    }

    pointsToNextRank() {
        return this.currentReputationRank.maxPoints - this.currentPoints;
    }

    questsToNextRank() {
        return Math.ceil(this.pointsToNextRank() / this.pointsPerQuest());
    }

    daysToNextRank() {
        return Math.ceil(this.questsToNextRank() / 3);
    }

    remainingRanks() {
        return Object.values(this.reputationRanks).filter((rank) => {
            return rank.tier >= this.currentTier;
        })
    }

    pointsToMaxRank() {
        return this.remainingRanks().reduce((x, y) => x + y.maxPoints, -this.currentPoints);
    }

    questsToMaxRank() {
        return Math.ceil(this.pointsToMaxRank() / this.pointsPerQuest());
    }

    daysToMaxRank() {
        return Math.ceil(this.questsToMaxRank() / 3);
    }
}

document.addEventListener('alpine:init', async () => {
    console.log('Running alpine:init hook');

    Alpine.store('tribes', []);
    const request = new Request('tribes.json');
    const response = await fetch(request);
    const data = await response.json();

    console.log('Fetched JSON data');

    const reputationStore = Alpine.$persist({}).as('reputation');

    console.log('reputationStore', reputationStore);

    Alpine.store('tribes', data['tribes'].map((item) => {
        const reputationRanks = Object.fromEntries(item['ranks'].map((r) => {
            return [r.tier, new Rank(r)];

        }));

        return new Tribe({
            name: item.name,
            expansion: item.expansion,
            reputationStore: reputationStore,
            reputationRanks: reputationRanks,
        });
    }));

    console.log('Completed alpine:init hook');
});
