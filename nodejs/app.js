import express from 'express';
import bodyParser from 'body-parser';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Get current date and time in the format yyyy-mm-dd_hh-mm-ss
    const currentDateTime = new Date();
    const year = currentDateTime.getFullYear();
    const month = String(currentDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(currentDateTime.getDate()).padStart(2, '0');
    const hours = String(currentDateTime.getHours()).padStart(2, '0');
    const minutes = String(currentDateTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentDateTime.getSeconds()).padStart(2, '0');

    // Format the timestamp as yyyy-mm-dd_hh-mm-ss
    const formattedDate = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

    const fileExtension = file.originalname.split('.').pop();
    const baseName = file.originalname.replace(/\.[^/.]+$/, '');

    cb(null, `${baseName}-${formattedDate}.${fileExtension}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /xlsx|xls|pdf|txt/;
    const extname = filetypes.test(
      file.originalname.split('.').pop().toLowerCase()
    );
    if (extname) {
      return cb(null, true);
    }
    cb(
      new Error(
        'File upload only supports the following filetypes - ' + filetypes
      )
    );
  },
}).single('file');

app.get('/', (req, res) => {
  const fileDbPath = path.join(__dirname, 'files-db.json');
  const chatsDbPath = path.join(__dirname, 'chats-db.json');

  fs.readFile(fileDbPath, 'utf8', (err, fileData) => {
    let filesDb = [];
    if (err) {
      if (err.code === 'ENOENT') {
        console.log('File db not found, creating a new one.');
      } else {
        console.error('Error reading files-db.json:', err);
      }
    } else {
      try {
        filesDb = JSON.parse(fileData);
      } catch (parseErr) {
        console.error('Error parsing files-db.json:', parseErr);
      }
    }

    fs.readFile(chatsDbPath, 'utf8', (err, chatData) => {
      let chatsDb = [];
      if (err) {
        if (err.code === 'ENOENT') {
          console.log('Chats db not found, creating a new one.');
        } else {
          console.error('Error reading chats-db.json:', err);
        }
      } else {
        try {
          chatsDb = JSON.parse(chatData);
        } catch (parseErr) {
          console.error('Error parsing chats-db.json:', parseErr);
        }
      }

      // Sort chats by lastMessage date and get the most recent 7
      const recentChats = chatsDb
        .sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage))
        .slice(0, 7);

      res.render('dashboard', { title: 'Home', files: filesDb, recentChats });
    });
  });
});

app.post('/api/upload', async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).send(err.message);
    }

    // Get the form data (company-name, quarter, year) from the request body
    const { 'company-name': companyName, quarter, year } = req.body;

    // Ensure the required form data is present
    if (!companyName || !quarter || !year) {
      return res
        .status(400)
        .send('Missing required form fields (company-name, quarter, year).');
    }

    // Path to the JSON database file
    const fileDbPath = path.join(__dirname, 'files-db.json');

    const formData = new FormData();
    const filePath = path.join(__dirname, 'uploads', req.file.filename);
    formData.append('file', fs.createReadStream(filePath));

    const response = await axios.post(
      'http://localhost:5000/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...formData.getHeaders(),
        },
      }
    );

    // Read the current contents of files-db.json
    fs.readFile(fileDbPath, 'utf8', (readErr, data) => {
      let filesDb = [];
      let nextId = 1;

      if (readErr) {
        if (readErr.code === 'ENOENT') {
          // If file doesn't exist, initialize an empty array
          console.log('File db not found, creating a new one.');
        } else {
          return res.status(500).send('Error reading file.');
        }
      } else {
        try {
          // Parse the JSON data if file exists
          filesDb = JSON.parse(data);
          // Set the next ID based on the last item in the array
          nextId = filesDb.length
            ? Math.max(...filesDb.map((file) => file.id)) + 1
            : 1;
        } catch (parseErr) {
          // If JSON is malformed, log the error and initialize an empty array
          console.error('Error parsing JSON data:', parseErr);
          filesDb = []; // Initialize an empty array in case of a parsing error
          nextId = 1;
        }
      }

      // Ensure that filesDb is an array
      if (!Array.isArray(filesDb)) {
        filesDb = [];
      }

      const currentDateTime = new Date();
      const uyear = currentDateTime.getFullYear();
      const month = String(currentDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(currentDateTime.getDate()).padStart(2, '0');

      // Format the timestamp as yyyy-mm-dd_hh-mm-ss
      const formattedDate = `${uyear}-${month}-${day}`;
      // Create the file metadata with an ID
      const uploadedFile = {
        id: nextId,
        filename: req.file.filename,
        originalname: req.file.originalname,
        companyName,
        quarter,
        year,
        uploadTime: formattedDate,
      };

      // Add the new file metadata with ID to the files array
      filesDb.push(uploadedFile);

      // Write the updated data back to files-db.json
      fs.writeFile(
        fileDbPath,
        JSON.stringify(filesDb, null, 2),
        'utf8',
        (writeErr) => {
          if (writeErr) {
            return res.status(500).send('Error saving file information.');
          }

          // Send the response back to the client
          res
            .status(200)
            .send('File uploaded and metadata saved successfully!');
        }
      );
    });
  });
});

app.get('/chat', (req, res) => {
  // Generate a new UUID
  const uuid = uuidv4();

  // Path to store the chat file in the "chats" directory
  const chatFilePath = path.join(__dirname, 'chats', `${uuid}.json`);

  // Create an empty chat file (you can add initial data here if needed)
  const chatFileData = {}; // Empty data for now
  fs.writeFile(chatFilePath, JSON.stringify(chatFileData, null, 2), (err) => {
    if (err) {
      return res.status(500).send('Error creating chat file');
    }

    // Now save the UUID in chats-db.json
    const chatsDbPath = path.join(__dirname, 'chats-db.json');

    // Read the existing chats-db.json or create a new array
    fs.readFile(chatsDbPath, 'utf-8', (err, data) => {
      let chatsDb = [];
      if (!err && data) {
        let chatsDb = JSON.parse(data);
      }

      // Add the new UUID to the chats-db
      chatsDb.push({
        uuid: uuid,
        title: 'New Chat',
        lastMessage: new Date().toISOString(),
      });

      // Save the updated chats-db.json
      fs.writeFile(chatsDbPath, JSON.stringify(chatsDb, null, 2), (err) => {
        if (err) {
          return res.status(500).send('Error updating chats-db.json');
        }

        // Redirect to the newly created chat's URL
        res.redirect(`/chat/${uuid}`);
      });
    });
  });
});

// Route to render the individual chat page using the UUID
app.get('/chat/:uuid', (req, res) => {
  const { uuid } = req.params;

  // Paths to chat file and chats-db file
  const chatFilePath = path.join(__dirname, 'chats', `${uuid}.json`);
  const chatsDbPath = path.join(__dirname, 'chats-db.json');

  // Read the chats-db.json file to find the title for the given uuid
  fs.readFile(chatsDbPath, 'utf-8', (err, dbData) => {
    if (err) {
      console.error('Error reading chats-db.json:', err);
      return res.status(500).send('Error reading chats database.');
    }

    let chatTitle = 'Chat'; // Default title if the uuid is not found

    try {
      const chatsDb = JSON.parse(dbData);

      // Find the chat with the matching uuid in chats-db.json
      const chat = chatsDb.find((chat) => chat.uuid === uuid);

      if (chat) {
        chatTitle = chat.title; // Set the chat title from the chats-db.json
      } else {
        console.log(`Chat with UUID ${uuid} not found in chats-db.json.`);
      }
    } catch (parseErr) {
      console.error('Error parsing chats-db.json:', parseErr);
      return res.status(500).send('Error parsing chats database.');
    }

    // Check if the chat file exists
    fs.readFile(chatFilePath, 'utf-8', (err, data) => {
      if (err) {
        console.error(`Error reading chat file for UUID ${uuid}:`, err);
        return res.redirect(`/chat/${uuid}`); // Redirect if the chat file doesn't exist
      }

      let chatMessages = []; // Default to an empty array if no messages

      try {
        // Parse chat data from the file and extract messages
        const chatData = JSON.parse(data);
        chatMessages = chatData || []; // Use 'messages' field if available
      } catch (parseErr) {
        console.error('Error parsing chat file:', parseErr);
      }

      // Render the chat page with the UUID, title from chats-db, and chat messages
      res.render('chat', {
        title: chatTitle, // Title from chats-db.json
        uuid,
        chatMessages, // Send the messages to the EJS template
      });
    });
  });
});

app.post('/chat/:uuid', async (req, res) => {
  const { uuid } = req.params;
  const { message } = req.body;

  // Path to the chat file (in the 'chats' folder)
  const chatFilePath = path.join(__dirname, 'chats', `${uuid}.json`);
  const chatsDbPath = path.join(__dirname, 'chats-db.json');

  try {
    let getName = 0;
    let title = '';
    let past = [];

    // Check if the chat file exists
    if (fs.existsSync(chatFilePath)) {
      const chatFileData = fs.readFileSync(chatFilePath, 'utf8');
      const chatData = JSON.parse(chatFileData);

      // If there are no previous messages, set getName to 1
      if (chatData && chatData.length > 0) {
        console.log('Existing messages:', chatData);
        past = chatData;
      } else {
        getName = 1;
        console.log('No previous messages.');
      }
    } else {
      // If the file doesn't exist, log a message and initialize a new file
      console.log(
        `Chat file for UUID ${uuid} does not exist. Creating a new one.`
      );
    }

    // Make a regular POST request to Flask to get a non-streamed response
    const response = await axios.post(
      'http://127.0.0.1:5000/rag',
      { message, past_messages: past, chatName: getName },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // If getName is 1, update the title in chats-db.json with the new name (response.data[2])
    if (getName === 1 && response.data[2]) {
      const newName = response.data[2]; // Assuming the new name is in response.data[2]
      title = newName; // Set the title to the new name

      // Read the existing chats-db.json
      fs.readFile(chatsDbPath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading chats-db.json:', err);
          return res.status(500).send('Error reading chats-db.json');
        }

        let chatsDb = [];
        try {
          chatsDb = JSON.parse(data);
        } catch (parseErr) {
          console.error('Error parsing chats-db.json:', parseErr);
        }

        // Find the chat with the matching uuid and update the title
        const chatIndex = chatsDb.findIndex((chat) => chat.uuid === uuid);

        if (chatIndex !== -1) {
          // Update the title with the new name
          chatsDb[chatIndex].title = newName;
          chatsDb[chatIndex].lastMessage = new Date().toISOString();

          // Write the updated chatsDb back to the file
          fs.writeFile(
            chatsDbPath,
            JSON.stringify(chatsDb, null, 2),
            'utf8',
            (writeErr) => {
              if (writeErr) {
                console.error('Error writing to chats-db.json:', writeErr);
                return res.status(500).send('Error updating chats-db.json');
              }

              console.log(`Updated title for UUID ${uuid} in chats-db.json.`);
            }
          );
        } else {
          console.log(`Chat with UUID ${uuid} not found in chats-db.json.`);
        }
      });
    } else {
      const chatsDbData = fs.readFileSync(chatsDbPath, 'utf8');
      const chatsDb = JSON.parse(chatsDbData);

      const chat = chatsDb.find((chat) => chat.uuid === uuid);

      if (chat) {
        title = chat.title; // Set the current title from chats-db.json
      } else {
        console.log(`Chat with UUID ${uuid} not found in chats-db.json.`);
        title = 'Untitled'; // Default title if chat is not found
      }
    }

    // Render the chat page with the response from Flask
    const newMessage = {
      human: message,
      ai: response.data[1], // The response you got from Flask
    };
    past.push(newMessage);

    res.render('chat', {
      uuid,
      title,
      chatMessages: past,
    });

    // If needed, you can save the new message into the chat file (you can uncomment this part if required)

    const chatsDbData = fs.readFileSync(chatsDbPath, 'utf8');
    const chatsDb = JSON.parse(chatsDbData);

    const chatIndex = chatsDb.findIndex((chat) => chat.uuid === uuid);
    if (chatIndex !== -1) {
      // Update the lastMessage field with the new message
      chatsDb[chatIndex].lastMessage = new Date().toISOString();

      // Write the updated chatsDb back to the file
      fs.writeFileSync(chatsDbPath, JSON.stringify(chatsDb, null, 2), 'utf8');
      console.log(`Updated last message for UUID ${uuid} in chats-db.json.`);
    }

    if (fs.existsSync(chatFilePath)) {
      // If the file exists, read the current chat data
      const chatFileData = fs.readFileSync(chatFilePath, 'utf8');
      let updatedChatData = JSON.parse(chatFileData);

      // Check if the data is an array; if not, initialize it as an array
      if (!Array.isArray(updatedChatData)) {
        updatedChatData = [];
      }

      // Append the new message to the existing chat data
      updatedChatData.push(newMessage);

      // Write the updated data back to the chat file
      fs.writeFileSync(chatFilePath, JSON.stringify(updatedChatData, null, 2));
    } else {
      // If the chat file doesn't exist, create a new file with the new message as the initial content
      const initialData = [newMessage];
      fs.writeFileSync(chatFilePath, JSON.stringify(initialData, null, 2));
    }
  } catch (error) {
    console.error('Error during request to Flask:', error);
    res.render('chat', {
      uuid,
      message,
      response: 'Error communicating with Flask server.',
    });
  }
});

app.get('/files/:id/delete', (req, res) => {
  const fileId = parseInt(req.params.id, 10);
  const fileDbPath = path.join(__dirname, 'files-db.json');

  // Read the current contents of files-db.json
  fs.readFile(fileDbPath, 'utf8', (readErr, data) => {
    if (readErr) {
      return res.status(500).send('Error reading files-db.json');
    }

    let filesDb = [];
    try {
      filesDb = JSON.parse(data);
    } catch (parseErr) {
      return res.status(500).send('Error parsing files-db.json');
    }

    // Find the file with the given ID
    const fileIndex = filesDb.findIndex((file) => file.id === fileId);
    if (fileIndex === -1) {
      return res.status(404).send('File not found');
    }

    const filename = filesDb[fileIndex].filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    // Send a request to the Python API to delete the file
    axios
      .post('http://127.0.0.1:5000/delete', { filename })
      .then((response) => {
        console.log('File deletion request sent to Python API:', response.data);
      })
      .catch((error) => {
        console.error(
          'Error sending file deletion request to Python API:',
          error
        );
      });
    // Delete the file from the uploads folder
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        return res.status(500).send('Error deleting file from uploads folder');
      }

      // Remove the record from files-db.json
      filesDb.splice(fileIndex, 1);

      // Write the updated data back to files-db.json
      fs.writeFile(
        fileDbPath,
        JSON.stringify(filesDb, null, 2),
        'utf8',
        (writeErr) => {
          if (writeErr) {
            return res.status(500).send('Error updating files-db.json');
          }

          res.redirect('/');
        }
      );
    });
  });
});

app.get('/chat/:uuid/delete', (req, res) => {
  const { uuid } = req.params;
  const chatFilePath = path.join(__dirname, 'chats', `${uuid}.json`);
  const chatsDbPath = path.join(__dirname, 'chats-db.json');

  // Delete the chat file from the chats folder
  fs.unlink(chatFilePath, (unlinkErr) => {
    if (unlinkErr) {
      return res.status(500).send('Error deleting chat file');
    }

    // Read the current contents of chats-db.json
    fs.readFile(chatsDbPath, 'utf8', (readErr, data) => {
      if (readErr) {
        return res.status(500).send('Error reading chats-db.json');
      }

      let chatsDb = [];
      try {
        chatsDb = JSON.parse(data);
      } catch (parseErr) {
        return res.status(500).send('Error parsing chats-db.json');
      }

      // Find the chat with the given UUID
      const chatIndex = chatsDb.findIndex((chat) => chat.uuid === uuid);
      if (chatIndex === -1) {
        return res.status(404).send('Chat not found');
      }

      // Remove the record from chats-db.json
      chatsDb.splice(chatIndex, 1);

      // Write the updated data back to chats-db.json
      fs.writeFile(
        chatsDbPath,
        JSON.stringify(chatsDb, null, 2),
        'utf8',
        (writeErr) => {
          if (writeErr) {
            return res.status(500).send('Error updating chats-db.json');
          }

          res.redirect('/');
        }
      );
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
