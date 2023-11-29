const tracker = document.querySelector("#tracker");
const searchList = tracker.querySelector("#search-list");
const searchResults = tracker.querySelector("#search-results");
const center = tracker.querySelector("#center");
const entityTable = center.querySelector("#table");
const turnCounter = center.querySelector(".turn-counter");
const addSubtract = center.querySelector("#add-subtract");
const numberInput = addSubtract.querySelector("#number-input");

const combat = {
	turn: 0,
	round: 1,
};

const currentCreature = {
	id: "",
	attribute: "",
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
		notes: "",
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
		<th>Notes</th>
		<th></th>
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

function placeAddSubtract(e) {
	addSubtract.style.display = "flex";
	const place = e.target.getBoundingClientRect();
	addSubtract.style.top = `${place.height - 12}px`;
	e.target.parentElement.append(addSubtract);
}

function removeAddSubtract() {
	addSubtract.style.display = "none";
	numberInput.value = "1";
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

function modifyCurrentCreature(sub) {
	const creature = creatureTable.find((c) => c.id === currentCreature.id);
	const attr = currentCreature.attribute;
	const value = +numberInput.value;
	creature[attr] = +creature[attr] + sub * value;
	updateTable();
}

function createCell(creature) {
	function createInput(id) {
		const input = document.createElement("input");
		input.classList.add("input");
		input.classList.add(id);
		input.value = creature[id];
		return input;
	}

	function inputFunc(id, modId) {
		const input = createInput(id);
		input.value = creature[id];
		if (creature[id] === Number.MIN_SAFE_INTEGER) {
			input.value = "";
		}

		if (id === "hp" || id === "initiative") {
			input.type = "number";
			input.addEventListener("focusin", (e) => {
				placeAddSubtract(e);
				currentCreature.id = creature.id;
				currentCreature.attribute = id;
			});
		}

		input.addEventListener("input", (e) => {
			const mod = document.querySelector(`.mod.${id}.${modId}`);
			if (mod) {
				mod.textContent = `${e.target.value}`;
			}

			if (id === "initiative") {
				const bonus = initiativeBonus(creature);
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
		roll.title = `Roll ${id}`;
		roll.classList.add("roll");
		icon.src = "img/dice-twenty-faces-twenty.png";
		if (id === "hp" && creature.creature) {
			roll.addEventListener("click", () => {
				const hitDice = creature.creature.hit_points_roll;
				input.value = rollHP(hitDice);
				creature.hp = input.value;
			});
		} else if (id === "initiative") {
			roll.addEventListener("click", () => {
				const mod = document.querySelector(`.mod.${id}.${modId}`);
				const bonus = initiativeBonus(creature);

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
		{ id: "notes", func: inputFunc },
		{ id: "copy" },
		{ id: "remove" },
	];
	const cell = document.createElement("tr");
	cell.classList.add("cell");
	if (creature.hp <= 0 && creature.name !== "") cell.classList.add("dead");
	items.forEach((item) => {
		const cellItem = document.createElement("th");
		cellItem.classList.add("cell-item");
		if (item.id === "copy") {
			const copy = document.createElement("button");
			const icon = document.createElement("img");
			copy.classList.add("copy");
			icon.src = "img/copy.png";
			copy.title = "Copy this creature";
			copy.addEventListener("click", () => {
				creatureTable.push({ ...creature, id: Math.random().toString(36).substring(2, 9), initiative: Number.MIN_SAFE_INTEGER });
				updateTable();
			});
			copy.append(icon);
			cellItem.append(copy);
		} else if (item.id === "remove") {
			const remove = document.createElement("button");
			const icon = document.createElement("img");
			remove.classList.add("remove");
			icon.src = "img/trash-can.png";
			remove.title = "Remove this creature";
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
					const icon = document.createElement("img");
					icon.src = iconTable[res];
					icon.classList.add("damage-icon");
					icon.classList.add(key.value);
					icon.title = `${res} ${key.hover ? key.hover : key.value}`;
					cellItem.append(icon);
				});
			}
		} else {
			const input = item.func(item.id, "m" + creature.id);
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
				cell.addEventListener("focusout", (e) => {
					if (!e.relatedTarget) {
						removeAddSubtract();
					}
				});
			} else if (item.id === "name" && creature.creature) {
				const link = document.createElement("a");
				const icon = document.createElement("img");
				link.href = `https://www.dndbeyond.com/monsters/${creature.creature.index}`;
				link.target = "_blank";
				icon.src = "img/link.png";
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
	const keywords = [
		"bludgeoning",
		"piercing",
		"slashing",
		"lightning",
		"force",
		"thunder",
		"fire",
		"cold",
		"poison",
		"acid",
		"radiant",
		"necrotic",
		"psychic",
	];
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
				if (resistance.toLowerCase().includes("nonmagical")) result[keyword].hover = "resistance to nonmagical damage";
				if (resistance.toLowerCase().includes("silvered")) result[keyword].hover = "resistance to non-silvered weapons";
			}
		});
	});
	immunities.forEach((immunity) => {
		keywords.forEach((keyword) => {
			if (immunity.toLowerCase().includes(keyword)) {
				result[keyword] = { value: "immunity" };
				if (immunity.toLowerCase().includes("nonmagical")) result[keyword].hover = "immunity to nonmagical damage";
				if (immunity.toLowerCase().includes("silvered")) result[keyword].hover = "immunity to non-silvered weapons";
			}
		});
	});
	return result;
}

function initiativeBonus(creature) {
	if (!creature?.creature?.dexterity) return 0;
	return Math.floor((creature.creature.dexterity - 10) / 2);
}

const iconTable = {
	slashing: "img/slash_resist.png",
	bludgeoning: "img/crush_resist.png",
	piercing: "img/pierce_resist.png",
	force: "img/force_resist.png",
	lightning: "img/shock_resist.png",
	thunder: "img/thunder_resist.png",
	fire: "img/fire_resist.png",
	cold: "img/ice_resist.png",
	poison: "img/poison_resist.png",
	acid: "img/acid_resist.png",
	radiant: "img/divine_resist.png",
	necrotic: "img/dark_resist.png",
	psychic: "img/psychic_resist.png",
};

updateTable();
