const tracker = document.querySelector("#tracker");
const searchList = tracker.querySelector("#search-list");
const searchResults = tracker.querySelector("#search-results");
const center = tracker.querySelector("#center");
const entityTable = center.querySelector("#table");
const turnCounter = center.querySelector(".turn-counter");

const combat = {
	turn: 0,
	round: 1,
};

function advanceTurn() {
	combat.turn++;
	if (combat.turn >= creatureTable.length) {
		combat.turn = 0;
		combat.round++;
		turnCounter.textContent = `Round: ${combat.round}`;
	}
	updateTable();
}

function resetTurns() {
	combat.turn = 0;
	combat.round = 1;
	turnCounter.textContent = `Round: ${combat.round}`;
	updateTable();
}

async function getMonsters() {
	const mons = await fetch("https://www.dnd5eapi.co/api/monsters")
		.then((res) => res.json())
		.then((data) => data.results);
	return mons;
}

async function getMonster(monster) {
	const res = await fetch(`https://www.dnd5eapi.co${monster.url}`);
	const mon = await res.json();
	return mon;
}

let monsters;
getMonsters().then((mons) => {
	monsters = mons;
});

function emptyCell() {
	return {
		name: "",
		hp: 0,
		ac: 0,
		initiative: Number.MIN_SAFE_INTEGER,
		id: "",
	};
}

function searchMonster(e) {
	const search = e.target.value.toLowerCase();
	if (search.trim().length === 0) return removeSearchList();
	searchList.style.display = "flex";
	const results = monsters
		.filter((monster) => monster.name.toLowerCase().includes(search))
		.sort((a, b) => {
			if (a.name.toLowerCase().indexOf(search) < b.name.toLowerCase().indexOf(search)) return -1;
			if (a.name.toLowerCase().indexOf(search) > b.name.toLowerCase().indexOf(search)) return 1;
			return 0;
		});

	searchResults.innerHTML = "";
	results.forEach((result) => {
		const li = document.createElement("li");
		li.innerHTML = result.name;
		li.addEventListener("mousedown", () => {
			const entityCell = creatureTable.find((c) => c.id === e.target.getAttribute("data-id"));
			getMonster(result).then((monster) => {
				entityCell.name = monster.name;
				entityCell.hp = monster.hit_points;
				entityCell.ac = monster.armor_class[0].value;
				entityCell.creature = monster;
				entityCell.initiative = 0;
				updateTable();
			});
		});
		searchResults.append(li);
	});
}

function sortTable() {
	creatureTable.sort((a, b) => b.initiative - a.initiative);
	updateTable();
}

let creatureTable = [emptyCell(), emptyCell(), emptyCell(), emptyCell()];

function updateTable() {
	entityTable.innerHTML = `          
	<tr>
		<th>Initiative</th>
		<th>Name</th>
		<th>HP</th>
		<th>AC</th>
		<th>Resistances</th>
		<th>Statuses</th>
		<th></th>
	</tr>
	`;
	creatureTable.forEach((creature, index) => {
		creature.id = Math.random().toString(36).substring(2, 9);
		const cell = createCell(creature);
		if (combat.turn === index) cell.classList.add("active");
		entityTable.append(cell);
	});
}

function addCreature() {
	creatureTable.push(emptyCell());
	updateTable();
}

function clearTable() {
	creatureTable = [emptyCell(), emptyCell(), emptyCell(), emptyCell()];
	updateTable();
}

function placeSearchList(e) {
	searchList.style.display = "flex";
	const place = e.target.getBoundingClientRect();
	searchList.style.width = `${place.width}px`;
	searchList.style.top = `${place.height}px`;
	e.target.parentElement.append(searchList);
}

function removeSearchList() {
	searchList.style.display = "none";
	searchResults.innerHTML = "";
}

function createCell(creature) {
	function createInput(id) {
		const input = document.createElement("input");
		input.classList.add("input");
		input.classList.add(id);
		input.value = creature[id];
		return input;
	}

	function inputFunc(id) {
		const input = createInput(id);
		input.value = creature[id];
		if (creature[id] === Number.MIN_SAFE_INTEGER) {
			input.value = "";
		}

		input.addEventListener("input", (e) => {
			const mod = document.querySelector(`.mod.${id}`);
			mod.textContent = `${e.target.value}`;

			if (id === "initiative") {
				const bonus = Math.floor(creature.creature && (creature.creature.dexterity - 10) / 2) || 0;
				if (bonus) {
					mod.textContent += ` (${bonus > 0 ? "+" : "-"}${bonus})`;
				}
			}
		});
		input.addEventListener("change", (e) => {
			creature[id] = e.target.value;
		});
		return input;
	}

	function nameSearch(id) {
		const input = createInput(id);
		input.setAttribute("data-id", creature.id);
		input.value = creature.name;
		input.addEventListener("change", (e) => {
			creature.name = e.target.value;
		});

		input.addEventListener("input", (e) => {
			placeSearchList(e);
			searchMonster(e);
		});

		input.addEventListener("focusout", () => {
			removeSearchList();
		});

		return input;
	}

	function rollButton(input, id, modId) {
		const roll = document.createElement("button");
		const icon = document.createElement("img");
		roll.id = id;
		roll.classList.add("roll");
		icon.src = "./img/dice-twenty-faces-twenty.png";
		if (id === "hp" && creature.creature) {
			roll.addEventListener("click", () => {
				const hitDice = creature.creature.hit_points_roll;
				input.value = rollHP(hitDice);
				creature.hp = input.value;
			});
		} else if (id === "initiative") {
			roll.addEventListener("click", () => {
				const mod = document.querySelector(`.mod.${id}.${modId}`);
				const bonus = Math.floor(creature.creature && (creature.creature.dexterity - 10) / 2) || 0;

				input.value = Math.floor(Math.random() * 20) + 1 + bonus;
				mod.textContent = `${input.value}`;
				if (bonus) {
					mod.textContent += ` (${bonus > 0 ? "+" : "-"}${bonus})`;
				}
				creature.initiative = input.value;
			});
		}
		roll.append(icon);
		return roll;
	}

	const items = [
		{ id: "initiative", func: inputFunc, roll: true },
		{ id: "name", func: nameSearch },
		{ id: "hp", func: inputFunc, roll: true },
		{ id: "ac", func: inputFunc },
		{ id: "resistances", func: inputFunc },
		{ id: "statuses", func: inputFunc },
		{ id: "remove" },
	];
	const cell = document.createElement("tr");
	cell.classList.add("cell");
	items.forEach((item) => {
		const cellItem = document.createElement("th");
		cellItem.classList.add("cell-item");
		if (item.id === "remove") {
			const remove = document.createElement("button");
			const icon = document.createElement("img");
			remove.classList.add("remove");
			icon.src = "./img/trash-can.png";
			remove.addEventListener("click", () => {
				creatureTable = creatureTable.filter((c) => c.id !== creature.id);
				updateTable();
			});
			remove.append(icon);
			cellItem.append(remove);
		} else if (item.id === "resistances") {
			if (creature.creature) {
				resists = getResistances(creature.creature);
				Object.entries(resists).forEach(([res, key]) => {
					console.log(res, key);
					const icon = document.createElement("img");
					icon.src = iconTable[res];
					icon.classList.add("damage-icon");
					icon.classList.add(key.value);
					cellItem.append(icon);
				});
			}
		} else {
			const input = item.func(item.id);
			cellItem.append(input);
			if (item.id === "initiative") {
				const mod = document.createElement("p");
				mod.classList.add("mod");
				mod.classList.add(item.id);
				mod.classList.add("m" + creature.id);
				mod.textContent = input.value;
				if (creature.creature) {
					const bonus = Math.floor((creature.creature.dexterity - 10) / 2);
					if (bonus) {
						mod.textContent += ` (${bonus > 0 ? "+" : "-"}${bonus})`;
					}
				}

				cellItem.append(mod);
			}
			if (item.roll) {
				cellItem.append(rollButton(input, item.id, "m" + creature.id));
			} else if (item.id === "name" && creature.creature) {
				const link = document.createElement("a");
				const icon = document.createElement("img");
				link.href = `https://www.dndbeyond.com/monsters/${creature.creature.index}`;
				link.target = "_blank";
				icon.src = "./img/link.png";
				link.append(icon);
				cellItem.append(link);
			}
		}
		cell.append(cellItem);
	});
	return cell;
}

function rollHP(hitDice) {
	const diceAmnt = +hitDice.split("d")[0];
	const dice = +hitDice.split("d")[1].split("+")[0];
	const bonus = +hitDice.split("+")[1] || 0;
	console.log("diceAmnt", diceAmnt, "dice", dice, "bonus", bonus);
	let hp = 0;
	for (let i = 0; i < diceAmnt; i++) {
		hp += Math.floor(Math.random() * dice) + 1;
	}
	return Math.floor(hp + bonus);
}

function getResistances(creature) {
	const keywords = ["bludgeoning", "piercing", "slashing", "lightning", "fire", "cold", "poison", "acid", "radiant", "necrotic", "psychic"];
	const vulnerabilities = creature.damage_vulnerabilities;
	const resistances = creature.damage_resistances;
	const immunities = creature.damage_immunities;
	const result = {};
	vulnerabilities.forEach((vulnerability) => {
		keywords.forEach((keyword) => {
			if (vulnerability.toLowerCase().includes(keyword)) {
				result[keyword] = { value: "vulnerability" };
			}
		});
	});
	resistances.forEach((resistance) => {
		keywords.forEach((keyword) => {
			if (resistance.toLowerCase().includes(keyword)) {
				result[keyword] = { value: "resistance" };
			}
		});
	});
	immunities.forEach((immunity) => {
		keywords.forEach((keyword) => {
			if (immunity.toLowerCase().includes(keyword)) {
				result[keyword] = { value: "immunity" };
			}
		});
	});
	console.log(result);
	return result;
}

const iconTable = {
	slashing: "/img/slash_resist.png",
	bludgeoning: "/img/crush_resist.png",
	piercing: "/img/pierce_resist.png",
	lightning: "/img/shock_resist.png.png",
	fire: "/img/fire_resist.png",
	cold: "/img/ice_resist.png",
	poison: "/img/poison_resist.png",
	acid: "/img/acid_resist.png",
	radiant: "/img/divine_resist.png",
	necrotic: "/img/dark_resist.png",
	psychic: "/img/psychic_resist.png",
};

updateTable();

/* TÄLLÄ HETKELLÄ KESKEN: STATUS EFEKTIEN MERKKAAMINEN! */
