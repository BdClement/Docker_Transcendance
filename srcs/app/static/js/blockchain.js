// Variable global pour ne pas surveiller tout les stockage de tournoi mais uniquement ceux lies au client
let tournamentIdCurrentlyWatched = null;
let tournamentScoreListener = null;

const provider = new ethers.providers.JsonRpcProvider(window.env.ALCHEMY_RPC);
const contractAddress = window.env.CONTRACT_ADDRESS;
const contractABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "_lastOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "_newOwner",
          "type": "address"
        }
      ],
      "name": "OwnerShipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "_tounrnamentId",
          "type": "uint256"
        }
      ],
      "name": "TournamentScoreStored",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "getOwner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        }
      ],
      "name": "getTournamentScore",
      "outputs": [
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "",
          "type": "uint256[]"
        },
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_id",
          "type": "uint256"
        },
        {
          "internalType": "uint256[]",
          "name": "_players",
          "type": "uint256[]"
        },
        {
          "internalType": "uint256[]",
          "name": "_winner",
          "type": "uint256[]"
        },
        {
          "internalType": "string",
          "name": "_score",
          "type": "string"
        }
      ],
      "name": "storeScore",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]

const etherscanLink = `https://sepolia.etherscan.io/address/${contractAddress}`;

const contract = new ethers.Contract(contractAddress, contractABI, provider);

function startLiseningToTournament(tournamentId) {
	if (tournamentIdCurrentlyWatched == tournamentId) return;


	if (tournamentIdCurrentlyWatched !== null) {
	stopListeningToTournament(tournamentIdCurrentlyWatched);
	}

	tournamentIdCurrentlyWatched = tournamentId;

	console.log('Start listening to Tournament', tournamentId);

	tournamentScoreListener = (eventId) => {
    const eventIdNb = eventId.toNumber();
    console.log("eventId : ", eventId);
    console.log("eventIdNb : ", eventIdNb);
    console.log("tournamentIdCurrentlyWatched : ", tournamentIdCurrentlyWatched);
    if (eventIdNb === tournamentIdCurrentlyWatched) {
      console.log(`Evenement capte: Le tournoi ${eventIdNb} a ete stocke sur le contrat ${contractAddress}`);
      showNotification(`Le score du tournoi ${eventIdNb} a bien ete stocke sur le contrat a l'adresse : <a href="${etherscanLink}" target="_blank">${contractAddress}</a>`, true);
      stopListeningToTournament(eventIdNb);
    }
	}
	contract.on("TournamentScoreStored", tournamentScoreListener)
}

function showNotification(message, isHTML = false) {
  const modalElement = document.getElementById('notificationModal');
	const messageElement = document.getElementById('notificationModalMessage')
  const modalInstance = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);

  if (modalInstance._isShown) {
    modalInstance.hide();
}
//Timeout pour etre sur que le modal soit bien cache pour afficher lautre
setTimeout(() => {
  if (isHTML) {
    messageElement.innerHTML = message;
  } else {
    messageElement.textContent = message;
  }
  modalInstance.show();
}, 200);

}

function stopListeningToTournament(tournamentId) {
	if (tournamentIdCurrentlyWatched !== null) {
		contract.removeListener("TournamentScoreStored", tournamentScoreListener);
		console.log(`Arret de l'ecoute du stockage du score du tournoi ${tournamentId}`);
    contract.off("TournamentScoreStored", tournamentScoreListener);
    tournamentIdCurrentlyWatched = null;
		tournamentScoreListener = null;
	}
}
