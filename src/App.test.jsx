import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App";
import { useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";

// Mocking `useAuth` to simulate authentication
jest.mock("./contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

describe("App Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders Stop Tracker landing page", () => {
    // Mock `useAuth` to simulate a logged-out user
    useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    expect(screen.getByText(/Stop Tracker/i)).toBeInTheDocument();
  });

  test("renders theme toggle button", () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    const themeToggle = screen.getByRole("button", { name: /toggle theme/i });
    expect(themeToggle).toBeInTheDocument();
  });

  test("navigates to authentication when login is clicked", () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    const loginButton = screen.getByText(/login/i);
    fireEvent.click(loginButton);

    expect(screen.getByText(/Sign in/i)).toBeInTheDocument();
  });

  test("renders dashboard after login", () => {
    // Mock `useAuth` to simulate a logged-in user
    useAuth.mockReturnValue({
      user: { uid: "12345", displayName: "Test User", email: "test@example.com" },
      loading: false,
    });

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    expect(screen.getByText(/Stop Tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  test("handles logout correctly", () => {
    useAuth.mockReturnValue({
      user: { uid: "12345", displayName: "Test User", email: "test@example.com" },
      loading: false,
    });

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );

    const profileMenuButton = screen.getByText(/Stop Tracker/i);
    fireEvent.click(profileMenuButton);

    const logoutButton = screen.getByText(/Sign Out/i);
    fireEvent.click(logoutButton);

    // Assuming logout redirects to the landing page
    expect(screen.getByText(/Stop Tracker/i)).toBeInTheDocument();
  });
});