import AuthLayout from "../../components/auth/AuthLayout";
import RegisterForm from "../../components/auth/RegisterForm";

export default function Register() {
  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register to access the AI Healthcare Communication Assistant"
    >
      <RegisterForm />
    </AuthLayout>
  );
}