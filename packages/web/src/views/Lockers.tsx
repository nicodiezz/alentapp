import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  Input,
  Spinner,
  Stack,
  Table,
  Text,
} from "@chakra-ui/react";
import { LuPlus, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState } from "react";
import type { CreateLockerRequest, LockerDTO } from "@alentapp/shared";
import { lockersService } from "../services/lockers";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
  DialogCloseTrigger,
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";

const initialFormData: CreateLockerRequest = {
  number: 1,
  location: "",
};

export function LockersView() {
  const [lockers, setLockers] = useState<LockerDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateLockerRequest>(initialFormData);

  const fetchLockers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await lockersService.getAll();
      setLockers(data);
    } catch (err: any) {
      setError(err.message || "Error al cargar los casilleros");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await lockersService.create(formData);
      setFormData(initialFormData);
      setIsDialogOpen(false);
      alert("Casillero creado correctamente");
      fetchLockers();
    } catch (err: any) {
      alert(err.message || "Error al crear el casillero");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchLockers();
  }, []);

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Casilleros</Heading>
            <Text color="fg.muted" fontSize="md">
              Registra casilleros disponibles para los socios de Alentapp.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchLockers} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Agregar Casillero
            </Button>
          </HStack>
        </Flex>

        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Casillero</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                <Field label="Número" required>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: Number(e.target.value) })}
                    required
                  />
                </Field>
                <Field label="Ubicación" required>
                  <Input
                    placeholder="Ej. Vestuario A"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </Field>
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                Crear Casillero
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" border="1px solid" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text>
            <Text>{error}</Text>
          </Box>
        )}

        <Box
          bg="bg.panel"
          borderRadius="xl"
          boxShadow="sm"
          borderWidth="1px"
          overflow="hidden"
          minH="300px"
          position="relative"
        >
          {isLoading ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Spinner size="xl" color="blue.500" />
                <Text color="fg.muted">Cargando casilleros...</Text>
              </Stack>
            </Center>
          ) : lockers.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron casilleros.</Text>
                <Button variant="ghost" onClick={fetchLockers}>Reintentar</Button>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Número</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Ubicación</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Socio Asignado</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {lockers.map((locker) => (
                  <Table.Row key={locker.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold" color="fg.emphasized">
                      {locker.number}
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{locker.location}</Table.Cell>
                    <Table.Cell>
                      <Box
                        display="inline-block"
                        px="2"
                        py="0.5"
                        borderRadius="md"
                        bg={locker.status === "Available" ? "green.50" : "orange.50"}
                        color={locker.status === "Available" ? "green.700" : "orange.700"}
                        fontSize="xs"
                        fontWeight="bold"
                      >
                        {locker.status}
                      </Box>
                    </Table.Cell>
                    <Table.Cell color="fg.muted">{locker.member_id || "-"}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Box>
      </Stack>
    </DialogRoot>
  );
}
