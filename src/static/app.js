document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const signupContainer = document.getElementById("signup-container");
  const teacherRequired = document.getElementById("teacher-required");
  const authButton = document.getElementById("auth-button");
  const loginDialog = document.getElementById("login-dialog");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const cancelLogin = document.getElementById("cancel-login");
  let teacherUsername = null;

  function updateTeacherUi() {
    const isTeacher = Boolean(teacherUsername);
    signupContainer.hidden = !isTeacher;
    teacherRequired.hidden = isTeacher;
    const icon = document.createElement("span");
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "👤";
    authButton.replaceChildren(
      icon,
      document.createTextNode(
        isTeacher ? ` ${teacherUsername} · Sign out` : " Teacher sign in"
      )
    );
    authButton.setAttribute(
      "aria-label",
      isTeacher ? `Sign out ${teacherUsername}` : "Teacher sign in"
    );
  }

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      if (!response.ok) {
        throw new Error("Activity request failed");
      }
      const activities = await response.json();

      // Clear loading message
      activitiesList.replaceChildren();
      activitySelect.replaceChildren(new Option("-- Select an activity --", ""));

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;
        const title = document.createElement("h4");
        title.textContent = name;
        const description = document.createElement("p");
        description.textContent = details.description;
        const schedule = document.createElement("p");
        schedule.innerHTML = `<strong>Schedule:</strong> `;
        schedule.append(document.createTextNode(details.schedule));
        const availability = document.createElement("p");
        availability.innerHTML = "<strong>Availability:</strong> ";
        availability.append(document.createTextNode(`${spotsLeft} spots left`));
        activityCard.append(title, description, schedule, availability);

        const participantsContainer = document.createElement("div");
        participantsContainer.className = "participants-container";
        if (details.participants.length > 0) {
          const participantsSection = document.createElement("div");
          participantsSection.className = "participants-section";
          const participantsTitle = document.createElement("h5");
          participantsTitle.textContent = "Participants:";
          const participantsList = document.createElement("ul");
          participantsList.className = "participants-list";

          details.participants.forEach((email) => {
            const participant = document.createElement("li");
            const participantEmail = document.createElement("span");
            participantEmail.className = "participant-email";
            participantEmail.textContent = email;
            participant.append(participantEmail);
            if (teacherUsername) {
              const unregisterButton = document.createElement("button");
              unregisterButton.className = "delete-btn";
              unregisterButton.type = "button";
              unregisterButton.textContent = "Unregister";
              unregisterButton.setAttribute(
                "aria-label",
                `Unregister ${email} from ${name}`
              );
              unregisterButton.dataset.activity = name;
              unregisterButton.dataset.email = email;
              unregisterButton.addEventListener("click", handleUnregister);
              participant.append(unregisterButton);
            }
            participantsList.append(participant);
          });
          participantsSection.append(participantsTitle, participantsList);
          participantsContainer.append(participantsSection);
        } else {
          const emptyMessage = document.createElement("p");
          const emptyText = document.createElement("em");
          emptyText.textContent = "No participants yet";
          emptyMessage.append(emptyText);
          participantsContainer.append(emptyMessage);
        }
        activityCard.append(participantsContainer);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

    } catch (error) {
      activitiesList.textContent =
        "Failed to load activities. Please try again later.";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.currentTarget;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        await fetchActivities();
      } else {
        showMessage(
          response.status === 401
            ? "Please sign in as a teacher first."
            : result.detail || "An error occurred",
          "error"
        );
      }

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        await fetchActivities();
      } else {
        showMessage(
          response.status === 401
            ? "Please sign in as a teacher first."
            : result.detail || "An error occurred",
          "error"
        );
      }

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  authButton.addEventListener("click", async () => {
    if (!teacherUsername) {
      loginError.textContent = "";
      loginDialog.showModal();
      document.getElementById("username").focus();
      return;
    }

    try {
      await fetch("/auth/logout", { method: "POST" });
      teacherUsername = null;
      updateTeacherUi();
      await fetchActivities();
      showMessage("Signed out.", "info");
    } catch (error) {
      showMessage("Failed to sign out. Please try again.", "error");
      console.error("Error signing out:", error);
    }
  });

  cancelLogin.addEventListener("click", () => loginDialog.close());

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    const formData = new FormData(loginForm);
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.get("username"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        loginError.textContent = result.detail || "Unable to sign in.";
        return;
      }

      teacherUsername = result.username;
      updateTeacherUi();
      loginForm.reset();
      loginDialog.close();
      await fetchActivities();
      showMessage(`Signed in as ${teacherUsername}.`, "success");
    } catch (error) {
      loginError.textContent = "Unable to sign in. Please try again.";
      console.error("Error signing in:", error);
    }
  });

  async function initialize() {
    try {
      const response = await fetch("/auth/me");
      if (response.ok) {
        const session = await response.json();
        teacherUsername = session.authenticated ? session.username : null;
      }
    } catch (error) {
      console.error("Error checking teacher session:", error);
    }
    updateTeacherUi();
    await fetchActivities();
  }

  initialize();
});
