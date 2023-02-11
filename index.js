
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
    constructor({name, expansion, reputation, reputationRanks}) {
        this.name = name;
        this.expansion = expansion;
        this.reputation = reputation;
        this.reputationRanks = reputationRanks;
    }

    icon() {
        return `img/tribes/${this.name}.png`;
    }

    /**
     * The current reputation rank the player has achieved.
     * @returns Rank
     */
    rank() {
        return this.reputationRanks[this.reputation.tier];
    }

    progression() {
        if (this.reputation.tier === 0) {
            return `Unlock ${this.name} daily quests to start. `
        }

        if (this.rank().progressionAllied) {
            return `Complete <i>${this.expansion}</i> Allied tribal quests to continue.`
        }

        if (this.rank().maxPoints === this.reputation.points) {
            return `<strong>Complete the next ${this.name} story quest to continue.</strong>`
        }

        return undefined;
    }

    pointsPerQuest() {
        return this.rank().questPoints;
    }

    pointsToNextRank() {
        return this.rank().maxPoints - this.reputation.points;
    }

    questsToNextRank() {
        return Math.ceil(this.pointsToNextRank() / this.pointsPerQuest());
    }

    daysToNextRank() {
        return Math.ceil(this.questsToNextRank() / 3);
    }

    remainingRanks() {
        return Object.values(this.reputationRanks).filter((rank) => {
            return rank.tier >= this.reputation.tier;
        })
    }

    pointsToMaxRank() {
        return this.remainingRanks().reduce((x, y) => x + y.maxPoints, -this.reputation.points);
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

    Alpine.store('tribes', data.map((item) => {
        return new Tribe({
            name: item.name,
            expansion: item.expansion,
            reputation: Alpine.$persist({
                tier: 0,
                points: 0,
            }).as(item.name),
            reputationRanks: Object.fromEntries(item.ranks.map((r) => {
                return [r.tier, new Rank(r)];
            })),
        });
    }));

    console.log('Completed alpine:init hook');
});
