---
layout: post
title: Scorpio Linux Setup
---

# Description

In this blog post, you will learn how to setup the [Scorpio Scoring Engine](https://github.com/troy-cyber/scorpio) for Linux OSes.

## What is Scorpio?

Scorpio is a Python-based scoring engine created to score image vulnerabilities. Scorpio checks if a vulnerability has been fixed and gives live feedback to the students.

## How does Scorpio work?

The image creator (you) will implement vulnerabilities onto a virtual machine and record them onto **engine.py** which runs every 30 seconds. As the students secure the system, the scoring engine will update **Template.html** (Scoring Report) to display the fixed vulnerabilities.

# Instructions for setup

If you have already created the image with vulnerabilities and want to jump to Scorpio setup, [click here](#step-3-cloning-scorpio-repository-into-the-system--setting-up-directories).

## Steps

### Step 1: Open/Create a Sandbox Virtual Machine

To get started, first create your base image. You can grab free sandbox images at [linuxvmimages](https://www.linuxvmimages.com/). Since this post is meant for Linux and CyberPatriot, grab a [Ubuntu 20.04 Image](https://www.linuxvmimages.com/images/ubuntu-2004/) or a [Ubuntu 22.04 Image](https://www.linuxvmimages.com/images/ubuntu-2204/). Make sure to grab the Vmware image and **NOT** the VirtualBox.

Extract the image. After extracting, open the **.vmx** file by double-clicking it. Or, go into Vmware, click **Open a Virtual Machine**, then select the **.vmx** file to open.

Then run the image by clicking the play button.

### Step 2: Setting up/Implementing Vulnerabilities in the Image

Now that you have the sandbox image open, implement all your vulnerabilities in the image.

Here's 4 examples of vulnerabilities you can set up.

1. Adding an unauthorized user onto the system
    - ```sudo adduser username```
    - Example: ![unauthuseradd](https://github.com/xenonminer/xenonminer.github.io/assets/46347858/7b540450-2b31-4f69-b3cf-68cd9eb850e6)
2. Modifying the GUI Software & Updates Settings
    - Example: ![guisandu](https://github.com/xenonminer/xenonminer.github.io/assets/46347858/0747bcfb-0e37-473d-b0d7-3699c728ad17)
3. Installing a malicious package
    - ```sudo apt install package```
    - Example: ![hashcatinstall](https://github.com/xenonminer/xenonminer.github.io/assets/46347858/2facee6e-ebef-45c1-8fa1-732b31ff6798)
4. Adding a malicious file
    - ```touch /path/to/random/directory/file```
    - Example: ![touchfile](https://github.com/xenonminer/xenonminer.github.io/assets/46347858/6b8b7e42-2a37-4d52-bf5e-bd4716cc2741)

After creating the vulnerabilities, you want to create the README, Forensic Questions, and the **Set Name for Scoring Report** files. These files will be created on the Desktop of your main user.

The README can be written in Google Docs. [Here is an example README](https://docs.google.com/document/d/1M4mljp9yEzb5GLsibm0Z7RqTzpiPQalwZlfn4i8nixo). After creating the README, download the README as a **pdf** onto the system and rename it to **README.pdf**. Then move it onto the Desktop.

```bash
mv ~/Downloads/README_download ~/Desktop/README.pdf
```

The Forensic Question files should be in the format "Forensics_#.txt". Create them using the command ```touch Forensics_#.txt```. The accepted format is as follows:

```
(Example: Example_Answer)

Question: Question_Here

Answer:
```

Also, create the "Set Name for Scoring Report" on the Desktop of the main user: ```touch "Set Name for Scoring Report"```. The accepted format is as follows:
```
YOUR FULL NAME: [id]
```
The competitor/student completing the image will fill in the **id** upon opening the image. The **id** can be anything you choose.

Other things to configure are:
- Your main user's **.bash_history file** and root's **.bash_history** file. This clears your bash history permanently so students can't figure out what commands you ran.
  - To do this with example user ```joe```, run the commands
    ```bash
    rm -rf /home/joe/.bash_history
    ln -s /dev/null /home/joe/.bash_history
    sudo rm -rf /root/.bash_history
    sudo ln -s /dev/null /root/.bash_history
    ```
- Autologin for your main user with gdm3
  - To set this up with ```joe```, edit the **/etc/gdm3/custom.conf**
  Then uncomment and edit the following lines to look like this:
      ```bash
      AutomaticLoginEnable=true
      AutomaticLogin=joe
      ``` 

### Step 3: Cloning Scorpio Repository into the system + Setting up directories

After adding all the vulnerabilities, you can start setting up the engine.

Install python2, pip, pyconcrete, and git on the image:
```bash
sudo apt install python2 -y
sudo apt install python3-pip -y
sudo PYCONCRETE_PASSPHRASE=password_here pip install pyconcrete
sudo apt install git -y
```

Clone the engine repository: ```git clone https://github.com/troy-cyber/scorpio.git``` and rename it to the ```/opt/temp``` directory with ```mv scorpio /opt/temp```.

### Step 4: Configuring the Engine

After cloning the repository and setting up the directories, set up the engine.

First, change the **imageName** at the top of **engine.py** so it fits your image. This name will be displayed at the top of the Scoring Report.

Then, change all occurences of ```kaisa``` to your main user's username.

### Step 5: Checking Vulnerabilities with the Engine

After you have added the vulnerabilities, configure them to be checked in the engine.

Navigate to **/opt/temp/** and open up **engine.py**.

The lines to change are the ones that look like this: 
```py
vulns.append(newCommandObject(
    'cat /home/kaisa/Desktop/Forensics_1.txt', 'Valoran City Park', 
    True, 6, 'Forensics Question 1 correct'))
```

These lines add a vuln object with specific parameters. Going left to right the parameters are:
- The command to check the vuln
- What to check for in the result of the command
- If the command was checked for that value, put True. If it was checked for not being that value, put False.
- Number of points assigned for that vulnerability
- Scoring Report message

The 4 vulns from earlier would look like this:
- Checking for unauthorized user deletion (user will be bob):
  ```py
  vulns.append(newCommandObject(
      'cat /etc/passwd | grep -v "#" | grep bob | wc -l',
      '1', False, 5, 'Removed unauthorized user bob'))
    ```
- Fixing GUI Software & Updates Settings
  ```py
  vulns.append(newCommandObject(
      'cat /etc/apt/apt.conf.d/20auto-upgrades | grep "APT::Periodic::Update-Package-Lists" | grep "1" | wc -l', 
      '1', True, 5, 'Daily updates enabled'))
  ```
- Checking for a deleted package
  ```py
  vulns.append(newCommandObject(
      'apt list --installed hashcat', 'installed', 
      False, 5, 'Prohibited software hashcat removed'))
  ```
- Checking for a deleted file
  ```py
  vulns.append(newCommandObject(
      'ls /home/bob/.passwords.txt | wc -l', '0', 
      True, 5, 'Removed plaintext password file'))
  ```

With these checks, you are trying to find the result to see if it's there and modify the ```newCommandObject``` based on that.

### Step 6: Encrypting the engine

We need to encrypt the engine to make sure no one can read the vulns. Since pyconcrete should already be installed, you can now run:
```py
pyconcrete-admin.py compile --source=/opt/temp --pye
```
to encrypt the **engine.py** into a **engine.pye**.

Now, save the original **engine.py** onto your Google Drive/Github just in case you need to make engine edits later. **There will most likely be bugs with the engine the first time around, so please do this!**

Then, delete the original **engine.py** from **/opt/temp/** to make sure no one can directly see the vulns.

### Step 7: Setting up the engine service

After encrypting the engine, make the engine a service so that it runs forever (as long as it's not disabled/stopped).

Create the file **/lib/systemd/system/engine.service** with ```sudo nano /lib/systemd/system/engine.service```
Copy and paste the following into the file:
```bash
[Unit]
Description=Scoring Engine
After=network.target
StartLimitIntervalSec=0
  
[Service]
Type=simple
Restart=always
RestartSec=1
User=root
ExecStart=pyconcrete /opt/temp/engine.pye
  
[Install]
WantedBy=multi-user.target
```

Then, enable the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable engine
reboot
sudo systemctl status engine
```

### Step 8: Powering Off and Exporting

After setting up the engine service, the image is fully created with the vulnerabilities and the scoring engine.

Power off the image. After powering off the image, go into the settings and modify the **Memory** to 4 GB and **Processors** to 2 GB. Also modify the image name to the theme of the image.

Zip up the entire image directory with **7zip** to a new zip file. This may take some time.

### Step 9: Testing the Image

Have someone else extract the zip file, run the image, and test every vulnerability to make sure the scoring works properly. Once you do that, you should have a working image!

Hope this helps!

*edited by* [prince-of-tennis](https://github.com/prince-of-tennis)
